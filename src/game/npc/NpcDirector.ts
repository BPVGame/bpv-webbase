/**
 * NpcDirector — orchestrates living NPCs on top of IsoEarth.
 * Game engine remains authoritative; ElloFive only proposes structured intents.
 */

import {
  LivingNpc,
  PlayerSnapshot,
  DynamicQuest,
  AiCallMeta,
  StructuredAiDecision,
  WorldEvent
} from './types';
import { WorldClock, updateNeeds, posFromWorld, currentScheduleBlock } from './worldClock';
import { WorldEventBus } from './worldEvents';
import { seedLivingNpcs } from './catalog/seedNpcs';
import { computeLod, AiBudget, aiPriority, DEFAULT_AI_BUDGET } from './simulation/lod';
import { planIntention, resolveLocationTarget } from './simulation/planner';
import { abstractSimulate } from './simulation/backgroundSim';
import { simulateNpcMeeting } from './simulation/npcToNpc';
import { buildDecisionPrompt, buildDialoguePrompt } from './ai/prompts';
import { requestNpcAi } from './ai/chatBaseClient';
import { executeTool, registerDefaultTools, ToolContext } from './tools/registry';
import { applyRelationshipDelta, applyPlayerAction, getOrCreateRelationship } from './relationships';
import { rememberInteraction, decayMemories } from './memory';
import { createNeedQuest, earnWage, spendOnFood, buyItem } from './economy';
import { applyEmotionDelta, moodFromEmotions } from './personality';
import { saveNpcState, loadNpcState, clearNpcState } from './persistence/localStore';
import { CHUNK_SIZE } from '../iso/WorldGen';

export interface NpcVisual {
  id: string;
  name: string;
  col: number;
  row: number;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  activity: string;
  mood: string;
}

export interface DialogueState {
  npcId: string;
  npcName: string;
  lines: Array<{ role: 'npc' | 'player'; text: string }>;
  emotion?: string;
}

export class NpcDirector {
  npcs = new Map<string, LivingNpc>();
  clock = new WorldClock({ timeScale: 0.85 });
  events = new WorldEventBus();
  quests: DynamicQuest[] = [];
  player: PlayerSnapshot = {
    id: 'player',
    username: 'Trainer',
    worldX: 0,
    worldY: 0,
    reputation: 50,
    coins: 250,
    inventory: []
  };

  dialogue: DialogueState | null = null;
  debugSelectedId: string | null = null;
  lastAiMeta: Map<string, AiCallMeta> = new Map();
  log: string[] = [];

  private budget = new AiBudget(DEFAULT_AI_BUDGET);
  private needAcc = 0;
  private meetAcc = 0;
  private saveAcc = 0;
  private moveAcc = 0;
  private lastDay = 1;
  private isWalkable: (x: number, y: number) => boolean = () => true;

  constructor() {
    registerDefaultTools();
  }

  setWalkableChecker(fn: (x: number, y: number) => boolean) {
    this.isWalkable = fn;
  }

  /** Initialize or restore persistent living world. */
  boot(playerName: string) {
    this.player.username = playerName;
    const saved = loadNpcState();
    if (saved) {
      this.clock.state = saved.clock;
      this.events.events = saved.events ?? [];
      this.quests = saved.quests ?? [];
      for (const n of saved.npcs) this.npcs.set(n.id, n);
      if (saved.player?.coins != null) this.player.coins = saved.player.coins;
      this.pushLog('Restored persistent NPC world');
    } else {
      for (const n of seedLivingNpcs()) this.npcs.set(n.id, n);
      this.events.maybeSpawnDaily(this.clock.state.day, this.worldNow(), {
        x: this.player.worldX,
        y: this.player.worldY
      });
      // Seed Maria lost-dog quest from real inventory tag
      const maria = this.npcs.get('npc_baker_maria');
      if (maria) {
        const q = createNeedQuest(maria, this.worldNow());
        if (q) this.quests.push(q);
      }
      this.pushLog('Seeded living NPCs');
    }
    this.lastDay = this.clock.state.day;
  }

  resetWorld() {
    clearNpcState();
    this.npcs.clear();
    this.quests = [];
    this.events.events = [];
    this.dialogue = null;
    this.clock = new WorldClock({ timeScale: 0.85 });
    this.boot(this.player.username);
  }

  worldNow(): number {
    return this.clock.state.day * 24 * 60 + this.clock.state.minuteOfDay;
  }

  updatePlayer(x: number, y: number, coins?: number) {
    this.player.worldX = x;
    this.player.worldY = y;
    if (coins != null) this.player.coins = coins;
  }

  getVisuals(): NpcVisual[] {
    return [...this.npcs.values()]
      .filter(n => n.simLod === 'full' || n.simLod === 'reduced')
      .map(n => ({
        id: n.id,
        name: n.name,
        col: n.currentLocation.worldX,
        row: n.currentLocation.worldY,
        skin: n.appearance.skin,
        hair: n.appearance.hair,
        shirt: n.appearance.shirt,
        pants: n.appearance.pants,
        activity: n.currentActivity,
        mood: n.currentMood
      }));
  }

  nearbyInteractable(range = 2): LivingNpc | null {
    let best: LivingNpc | null = null;
    let bestD = range + 0.01;
    for (const n of this.npcs.values()) {
      if (n.simLod === 'dormant') continue;
      const d = Math.hypot(n.currentLocation.worldX - this.player.worldX, n.currentLocation.worldY - this.player.worldY);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** Main tick — call from IsoEarth update. */
  tick(deltaSec: number) {
    this.clock.tick(deltaSec);
    if (this.clock.state.day !== this.lastDay) {
      this.lastDay = this.clock.state.day;
      this.events.maybeSpawnDaily(this.clock.state.day, this.worldNow(), {
        x: this.player.worldX,
        y: this.player.worldY
      });
      for (const n of this.npcs.values()) {
        n.memories = decayMemories(n.memories, 1, this.worldNow());
      }
    }

    // Sync weather events
    if (this.clock.state.weather === 'rain' || this.clock.state.weather === 'storm') {
      const kind = this.clock.state.weather === 'storm' ? 'storm' : 'rain';
      if (!this.events.active(this.worldNow()).some(e => e.kind === kind)) {
        this.events.emit(kind, kind === 'storm' ? 'Storm' : 'Rain', `The sky turns to ${kind}.`, this.worldNow(), {
          importance: kind === 'storm' ? 70 : 40
        });
      }
    }

    this.needAcc += deltaSec;
    this.meetAcc += deltaSec;
    this.saveAcc += deltaSec;
    this.moveAcc += deltaSec;

    for (const npc of this.npcs.values()) {
      npc.simLod = computeLod(npc, this.player);
      if (npc.simLod === 'dormant') continue;

      if (npc.simLod === 'abstract') {
        if (this.needAcc >= 5) abstractSimulate(npc, this.clock.state, 5);
        continue;
      }

      // Needs every ~3s
      if (this.needAcc >= 3) {
        updateNeeds(npc, 2, npc.currentActivity);
        npc.currentMood = moodFromEmotions(npc.emotions);
      }

      // Decision cadence
      const nowMs = Date.now();
      const decisionGap = npc.simLod === 'full' ? 2.5 : 8;
      if ((nowMs - npc.lastDecisionAt) / 1000 >= decisionGap) {
        this.runDecisionLayer(npc);
        npc.lastDecisionAt = nowMs;
      }

      // Movement for full/reduced
      if (this.moveAcc >= 0.2) {
        this.stepMovement(npc);
      }

      // Work / eat when at destination
      if (npc.currentActivity === 'work' && this.atPlace(npc, 'workplace')) {
        if (Math.random() < deltaSec * 0.15) earnWage(npc, 3);
      }
      if ((npc.currentActivity === 'lunch' || npc.currentActivity === 'breakfast') && Math.random() < deltaSec * 0.1) {
        spendOnFood(npc);
      }
    }

    if (this.needAcc >= 3) this.needAcc = 0;
    if (this.moveAcc >= 0.2) this.moveAcc = 0;

    if (this.meetAcc >= 4) {
      this.meetAcc = 0;
      this.runNearbyMeetings();
    }

    if (this.saveAcc >= 15) {
      this.saveAcc = 0;
      this.persist();
    }
  }

  private atPlace(npc: LivingNpc, key: string): boolean {
    const t = resolveLocationTarget(npc, key);
    return Math.hypot(npc.currentLocation.worldX - t.x, npc.currentLocation.worldY - t.y) < 2;
  }

  private runDecisionLayer(npc: LivingNpc) {
    const relevant = this.events.relevantTo(npc, this.worldNow());
    const planned = planIntention(npc, this.clock.state, relevant, this.player);
    npc.currentIntention = planned.intention;

    if (planned.escalateToAi && npc.simLod === 'full' && this.budget.canCall(npc, Date.now())) {
      void this.budget.schedule(npc.id, aiPriority(npc, this.player, false), async () => {
        await this.callAiDecision(npc, planned.reason);
      });
      return;
    }

    this.applyIntention(npc, planned.intention.intent, planned.intention.target);
  }

  private async callAiDecision(npc: LivingNpc, situation: string) {
    const relevant = this.events.relevantTo(npc, this.worldNow());
    const prompt = buildDecisionPrompt(npc, this.clock.state, relevant, this.player, situation);
    const result = await requestNpcAi({
      kind: 'decide',
      system: prompt.system,
      user: prompt.user,
      npc,
      player: this.player,
      situation
    });
    npc.lastAiCallAt = Date.now();
    npc.lastAiLatencyMs = result.latencyMs;
    npc.lastAiTokens = result.tokens;
    this.lastAiMeta.set(npc.id, {
      at: Date.now(),
      latencyMs: result.latencyMs,
      tokens: result.tokens,
      ok: result.ok,
      error: result.error,
      decision: result.decision
    });
    this.applyStructuredDecision(npc, result.decision);
    this.pushLog(`AI decide ${npc.name}: ${result.decision.intent} (${result.source})`);
  }

  applyStructuredDecision(npc: LivingNpc, d: StructuredAiDecision) {
    npc.currentIntention = {
      intent: d.intent,
      reason: d.reason,
      target: d.target ?? undefined,
      priority: d.priority,
      emotion: d.emotion ?? undefined,
      source: 'ellofive',
      issuedAt: this.worldNow()
    };
    if (d.emotion) {
      npc.currentMood = d.emotion;
    }
    if (d.relationship_change) {
      applyRelationshipDelta(npc, 'player', d.relationship_change, d.reason, this.worldNow(), 'player');
    }
    if (d.tool_calls?.length) {
      const ctx = this.toolCtx();
      for (const call of d.tool_calls) {
        executeTool(call.tool, call.args ?? {}, ctx);
      }
    }
    this.applyIntention(npc, d.intent, d.target ?? undefined);
  }

  private applyIntention(npc: LivingNpc, intent: string, target?: string | null) {
    const key =
      target === 'workplace' || target === 'home' || target === 'market' || target === 'plaza'
        ? target
        : intent.includes('WORK')
          ? 'workplace'
          : intent.includes('HOME') || intent.includes('SLEEP') || intent.includes('REST') || intent.includes('SHELTER') || intent.includes('SAFETY')
            ? 'home'
            : intent.includes('MARKET') || intent.includes('FOOD')
              ? 'market'
              : intent.includes('SOCIAL')
                ? 'plaza'
                : undefined;

    if (intent === 'WORK_FIRST' || intent === 'NEED_FOOD_NO_MONEY') {
      npc.currentActivity = 'work';
      this.queuePath(npc, resolveLocationTarget(npc, 'workplace'));
      return;
    }
    if (intent === 'FIND_FOOD') {
      npc.currentActivity = 'lunch';
      this.queuePath(npc, resolveLocationTarget(npc, 'market'));
      return;
    }
    if (intent === 'IDLE' || intent === 'NOTICE_PLAYER') {
      const block = currentScheduleBlock(npc, this.clock.state.minuteOfDay);
      npc.currentActivity = block?.activity ?? 'idle';
      return;
    }
    if (intent === 'TALK') {
      npc.currentActivity = 'talking';
      return;
    }
    if (intent === 'GIVE_QUEST') {
      const q = createNeedQuest(npc, this.worldNow());
      if (q && !this.quests.some(x => x.id === q.id)) this.quests.push(q);
      npc.currentActivity = 'offer_quest';
      return;
    }
    if (intent === 'FLEE') {
      npc.currentActivity = 'flee';
      this.queuePath(npc, resolveLocationTarget(npc, 'home'));
      return;
    }

    npc.currentActivity = intent.toLowerCase();
    if (key) this.queuePath(npc, resolveLocationTarget(npc, key));
  }

  private queuePath(npc: LivingNpc, target: { x: number; y: number }) {
    const res = executeTool(
      'find_path',
      {
        from_x: npc.currentLocation.worldX,
        from_y: npc.currentLocation.worldY,
        to_x: target.x,
        to_y: target.y
      },
      this.toolCtx()
    );
    if (res.ok && res.data && typeof res.data === 'object' && Array.isArray((res.data as any).path)) {
      npc.path = (res.data as any).path;
    }
  }

  private stepMovement(npc: LivingNpc) {
    if (!npc.path.length) return;
    const next = npc.path[0];
    if (!this.isWalkable(next.x, next.y)) {
      npc.path.shift();
      return;
    }
    npc.currentLocation = posFromWorld(next.x, next.y, CHUNK_SIZE);
    npc.path.shift();
  }

  private runNearbyMeetings() {
    const list = [...this.npcs.values()].filter(n => n.simLod === 'full' || n.simLod === 'reduced');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const result = simulateNpcMeeting(list[i], list[j], this.worldNow());
        if (result.type !== 'none' && result.type !== 'pass') {
          this.pushLog(result.summary);
        }
      }
    }
  }

  async startDialogue(npcId?: string): Promise<DialogueState | null> {
    const npc = npcId ? this.npcs.get(npcId) : this.nearbyInteractable();
    if (!npc) return null;
    this.debugSelectedId = npc.id;
    getOrCreateRelationship(npc, 'player', 'player');

    const relevant = this.events.relevantTo(npc, this.worldNow());
    const prompt = buildDialoguePrompt(npc, this.clock.state, relevant, this.player, [], 'Hello!');
    const result = await requestNpcAi({
      kind: 'dialogue',
      system: prompt.system,
      user: prompt.user,
      npc,
      player: this.player
    });
    npc.lastAiCallAt = Date.now();
    npc.lastAiLatencyMs = result.latencyMs;
    this.lastAiMeta.set(npc.id, {
      at: Date.now(),
      latencyMs: result.latencyMs,
      tokens: result.tokens,
      ok: result.ok,
      error: result.error,
      decision: result.decision
    });

    const line = result.decision.dialogue || `${npc.name} nods quietly.`;
    if (result.decision.relationship_change) {
      applyRelationshipDelta(npc, 'player', result.decision.relationship_change, 'Dialogue', this.worldNow(), 'player');
    } else {
      applyPlayerAction(npc, 'talk_friendly', this.worldNow());
    }
    rememberInteraction(npc, {
      event: 'conversation',
      description: `Spoke with player: ${line.slice(0, 80)}`,
      importance: 35,
      emotion: result.decision.emotion || 'neutral',
      timestamp: this.worldNow(),
      location: { x: npc.currentLocation.worldX, y: npc.currentLocation.worldY }
    });

    this.dialogue = {
      npcId: npc.id,
      npcName: npc.name,
      emotion: result.decision.emotion || npc.currentMood,
      lines: [{ role: 'npc', text: line }]
    };
    this.pushLog(`Dialogue with ${npc.name} (${result.source})`);
    return this.dialogue;
  }

  async replyDialogue(playerText: string): Promise<DialogueState | null> {
    if (!this.dialogue) return null;
    const npc = this.npcs.get(this.dialogue.npcId);
    if (!npc) return null;
    this.dialogue.lines.push({ role: 'player', text: playerText });

    const history = this.dialogue.lines.map(l => ({
      role: l.role === 'player' ? 'user' : 'assistant',
      content: l.text
    }));
    const relevant = this.events.relevantTo(npc, this.worldNow());
    const prompt = buildDialoguePrompt(npc, this.clock.state, relevant, this.player, history, playerText);
    const result = await requestNpcAi({
      kind: 'dialogue',
      system: prompt.system,
      user: prompt.user,
      npc,
      player: this.player
    });
    npc.lastAiCallAt = Date.now();
    npc.lastAiLatencyMs = result.latencyMs;
    this.lastAiMeta.set(npc.id, {
      at: Date.now(),
      latencyMs: result.latencyMs,
      ok: result.ok,
      error: result.error,
      decision: result.decision
    });

    const line = result.decision.dialogue || '…';
    this.dialogue.lines.push({ role: 'npc', text: line });
    this.dialogue.emotion = result.decision.emotion || this.dialogue.emotion;
    if (result.decision.relationship_change) {
      applyRelationshipDelta(npc, 'player', result.decision.relationship_change, playerText.slice(0, 40), this.worldNow(), 'player');
    }

    // Offer quest if player asks for help and NPC has need quest
    if (/help|quest|dog|lost/i.test(playerText)) {
      let q = this.quests.find(q => q.giverId === npc.id && q.status === 'available');
      if (!q) {
        q = createNeedQuest(npc, this.worldNow()) ?? undefined;
        if (q) this.quests.push(q);
      }
      if (q) {
        q.status = 'active';
        this.dialogue.lines.push({
          role: 'npc',
          text: `Quest: ${q.title} — ${q.description} (Reward: ${q.rewardCoins} coins)`
        });
      }
    }

    return this.dialogue;
  }

  endDialogue() {
    this.dialogue = null;
  }

  /** Debug helpers */
  forceAiDecision(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    void this.callAiDecision(npc, 'Debug force decision');
  }

  teleportNpc(npcId: string, x: number, y: number) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    if (!this.isWalkable(x, y)) return;
    npc.currentLocation = posFromWorld(x, y, CHUNK_SIZE);
    npc.path = [];
  }

  resetNpc(npcId: string) {
    const fresh = seedLivingNpcs().find(n => n.id === npcId);
    if (!fresh) return;
    this.npcs.set(npcId, fresh);
  }

  recordPlayerAction(
    action: Parameters<typeof applyPlayerAction>[1],
    npcId?: string,
    detail?: string
  ) {
    const targets = npcId ? [this.npcs.get(npcId)].filter(Boolean) as LivingNpc[] : [...this.npcs.values()].filter(n => n.simLod === 'full');
    for (const n of targets) {
      applyPlayerAction(n, action, this.worldNow(), detail);
      if (action === 'steal') {
        n.emotions = applyEmotionDelta(n.emotions, { anger: 25, trust: -20 });
        this.events.emit('theft', 'Theft Reported', `${n.name} was robbed.`, this.worldNow(), {
          importance: 70,
          location: { x: n.currentLocation.worldX, y: n.currentLocation.worldY, radius: 30 },
          participants: [n.id, 'player']
        });
      }
    }
  }

  toolCtx(): ToolContext {
    return {
      npcs: this.npcs,
      player: this.player,
      clock: this.clock.state,
      events: this.events.events,
      quests: this.quests,
      isWalkable: this.isWalkable,
      emitEvent: (e: WorldEvent) => this.events.push(e),
      now: this.worldNow()
    };
  }

  persist() {
    saveNpcState({
      version: 1,
      savedAt: Date.now(),
      clock: this.clock.snapshot(),
      npcs: [...this.npcs.values()],
      events: this.events.events,
      quests: this.quests,
      player: { coins: this.player.coins, reputation: this.player.reputation }
    });
  }

  private pushLog(msg: string) {
    this.log.unshift(`${new Date().toISOString().slice(11, 19)} ${msg}`);
    if (this.log.length > 50) this.log.length = 50;
  }

  getWorldTime() {
    return this.clock.getWorldTime();
  }

  getSelectedDebug() {
    const id = this.debugSelectedId;
    if (!id) return null;
    const npc = this.npcs.get(id);
    if (!npc) return null;
    return {
      npc,
      ai: this.lastAiMeta.get(id) ?? null,
      quests: this.quests.filter(q => q.giverId === id),
      relationship: npc.relationships.find(r => r.targetId === 'player') ?? null
    };
  }
}

/** Singleton for the play session */
export const npcDirector = new NpcDirector();
