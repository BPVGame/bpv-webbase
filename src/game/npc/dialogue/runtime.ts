/**
 * Cinematic dialogue runtime — templates first, ElloFive only when needed.
 */

import { LivingNpc, PlayerSnapshot, DynamicQuest, WorldEvent, NpcAppearance, StructuredAiDecision } from '../types';
import { WorldClock } from '../worldClock';
import { WorldEventBus } from '../worldEvents';
import { applyRelationshipDelta, applyPlayerAction, getOrCreateRelationship } from '../relationships';
import { rememberInteraction, retrieveMemories } from '../memory';
import { createNeedQuest } from '../economy';
import {
  AmbientTalk,
  ConversationRecord,
  DialogueChoice,
  DialogueLine,
  DialogueSpeaker,
  RpgDialogueScene,
  SpeechBubble,
  StoryBanner
} from './types';
import { normalizeEmotion } from './portraits';
import { collectWorldFacts } from './worldFacts';
import { greetingLine, npcReplyToChoice, playerChoicesFor, emotionFromNpc } from './templates';
import { buildNpcNpcScript } from './npcChat';
import { loadConversations, recordConversation } from './conversationStore';
import { createShipmentQuest, ensureStolenShipmentEvent, shouldStartShipmentStory } from './story';

export interface DialogueHost {
  npcs: Map<string, LivingNpc>;
  player: PlayerSnapshot;
  playerAppearance: NpcAppearance;
  quests: DynamicQuest[];
  events: WorldEventBus;
  clock: WorldClock;
  worldNow(): number;
  pushLog(msg: string): void;
  requestAiDialogue(
    npc: LivingNpc,
    history: Array<{ role: string; content: string }>,
    playerMessage: string
  ): Promise<StructuredAiDecision>;
}

let sceneSeq = 0;

function speakerFromNpc(npc: LivingNpc): DialogueSpeaker {
  return {
    id: npc.id,
    name: npc.name,
    kind: 'npc',
    appearance: npc.appearance,
    emotion: emotionFromNpc(npc)
  };
}

function playerSpeaker(host: DialogueHost): DialogueSpeaker {
  return {
    id: 'player',
    name: host.player.username,
    username: host.player.username,
    kind: 'player',
    appearance: host.playerAppearance,
    emotion: 'neutral'
  };
}

export class DialogueRuntime {
  scene: RpgDialogueScene | null = null;
  ambient: AmbientTalk | null = null;
  bubbles: SpeechBubble[] = [];
  banners: StoryBanner[] = [];
  conversations: ConversationRecord[] = [];
  cameraFocus: { x: number; y: number; weight: number } | null = null;
  lastMeet = new Map<string, number>();
  overhearHint: { names: string; npcId: string } | null = null;
  lastPlayerChat: Array<{ from: string; text: string; at: number }> = [];

  constructor(private host: DialogueHost) {
    this.conversations = loadConversations();
  }

  tick(nowMs: number) {
    this.bubbles = this.bubbles.filter(b => b.untilMs > nowMs);
    this.advanceAmbient(nowMs);
    this.updateOverhearHint();
    this.updateCamera();
  }

  nearbyTalking(range = 6): AmbientTalk | null {
    if (!this.ambient) return null;
    const a = this.host.npcs.get(this.ambient.aId);
    const b = this.host.npcs.get(this.ambient.bId);
    if (!a || !b) return null;
    const px = this.host.player.worldX;
    const py = this.host.player.worldY;
    const da = Math.hypot(a.currentLocation.worldX - px, a.currentLocation.worldY - py);
    const db = Math.hypot(b.currentLocation.worldX - px, b.currentLocation.worldY - py);
    if (Math.min(da, db) > range) return null;
    return this.ambient;
  }

  beginNpcTalk(npcId: string): RpgDialogueScene | null {
    const npc = this.host.npcs.get(npcId);
    if (!npc) return null;
    if (this.ambient && (this.ambient.aId === npcId || this.ambient.bId === npcId)) {
      return this.openOverhear(true);
    }

    getOrCreateRelationship(npc, 'player', 'player');
    const facts = collectWorldFacts(npc, this.host.clock.state, this.host.events.events, this.host.quests, this.host.npcs);
    const greet = greetingLine(npc, this.host.player, facts);
    const hasQuest = this.host.quests.some(q => q.giverId === npc.id && (q.status === 'available' || q.status === 'active'));
    const choices = npc.aiTier === 'background' ? [{ id: 'leave', label: 'Leave', tone: 'leave' as const }] : playerChoicesFor(npc, 'greeting', hasQuest);

    applyPlayerAction(npc, 'talk_friendly', this.host.worldNow());
    npc.currentActivity = 'talking';

    this.scene = {
      id: `dlg_${++sceneSeq}`,
      kind: 'npc_player',
      importance: npc.aiTier === 'important' ? 'important' : 'normal',
      speakers: [speakerFromNpc(npc), playerSpeaker(this.host)],
      lines: [{ speakerId: npc.id, text: greet.text, emotion: greet.emotion }],
      lineIndex: 0,
      choices,
      topic: 'greeting',
      overheard: false
    };
    this.stampSpeakerEmotion(this.scene);
    this.host.pushLog(`Talk ${npc.name}`);
    return this.scene;
  }

  openOverhear(join: boolean): RpgDialogueScene | null {
    const amb = this.ambient;
    if (!amb) return null;
    const a = this.host.npcs.get(amb.aId);
    const b = this.host.npcs.get(amb.bId);
    if (!a || !b) return null;
    amb.overheard = true;
    this.scene = {
      id: `ov_${amb.id}`,
      kind: join ? 'npc_player' : 'overhear',
      importance: amb.importance >= 70 ? 'important' : 'normal',
      speakers: [speakerFromNpc(a), speakerFromNpc(b), playerSpeaker(this.host)],
      lines: amb.lines.slice(0, Math.max(1, amb.index + 1)),
      lineIndex: Math.max(0, Math.min(amb.index, amb.lines.length - 1)),
      joinable: !join,
      overheard: true,
      topic: amb.topic,
      choices: join
        ? [
            { id: 'join_help', label: 'I overheard. I can help.', tone: 'brave', memoryEvent: 'player_joined_rumor', relationship: { friendship: 2, trust: 2 } },
            { id: 'join_ask', label: 'What happened?', tone: 'curious' },
            { id: 'leave', label: 'Leave them to it', tone: 'leave' }
          ]
        : [{ id: 'join', label: 'Join the conversation', tone: 'join' }, { id: 'leave', label: 'Keep walking', tone: 'leave' }]
    };
    if (join) {
      this.scene.kind = 'npc_player';
      this.scene.joinable = false;
      rememberInteraction(a, {
        event: 'player_overheard',
        description: `${this.host.player.username} joined a talk about ${amb.topic}`,
        importance: 50,
        emotion: 'surprised',
        timestamp: this.host.worldNow(),
        participants: [a.id, b.id, 'player'],
        subject: 'player'
      });
    }
    this.maybeOfferShipmentQuest(a, b);
    this.pushBanner({
      id: `bn_${amb.id}`,
      kind: 'rumor',
      title: 'Overheard',
      text: `${a.name} and ${b.name} are talking about ${amb.topic.replace(/_/g, ' ')}.`
    });
    return this.scene;
  }

  advanceLine(): RpgDialogueScene | null {
    if (!this.scene) return null;
    if (this.scene.lineIndex < this.scene.lines.length - 1) {
      this.scene.lineIndex += 1;
      this.stampSpeakerEmotion(this.scene);
      return this.scene;
    }
    return this.scene;
  }

  choose(choiceId: string): RpgDialogueScene | null {
    if (!this.scene) return null;
    if (choiceId === 'join') return this.openOverhear(true);
    if (choiceId === 'leave') {
      this.endScene('left');
      return null;
    }

    const npc = this.primaryNpc();
    if (!npc) return this.scene;
    const facts = collectWorldFacts(npc, this.host.clock.state, this.host.events.events, this.host.quests, this.host.npcs);
    const choice = this.scene.choices?.find(c => c.id === choiceId);
    const reply = npcReplyToChoice(npc, choiceId === 'join_help' ? 'offer_help' : choiceId === 'join_ask' ? 'ask_news' : choiceId, this.host.player, facts);

    this.scene.lines.push({ speakerId: 'player', text: choice?.label ?? choiceId, emotion: 'neutral' });
    this.scene.lines.push({ speakerId: npc.id, text: reply.text, emotion: reply.emotion });
    this.scene.lineIndex = this.scene.lines.length - 1;
    this.stampSpeakerEmotion(this.scene);

    if (choice?.relationship) {
      applyRelationshipDelta(npc, 'player', choice.relationship, choice.label, this.host.worldNow(), 'player');
    }
    if (choice?.memoryEvent) {
      rememberInteraction(npc, {
        event: choice.memoryEvent,
        description: `Player: ${choice.label}`,
        importance: choice.memoryEvent === 'player_promised_to_help' ? 80 : 45,
        emotion: reply.emotion,
        timestamp: this.host.worldNow(),
        participants: [npc.id, 'player'],
        subject: 'player',
        significant: choice.memoryEvent === 'player_promised_to_help'
      });
    }

    if (choiceId === 'offer_help' || choiceId === 'join_help') {
      this.activateHelpQuest(npc);
    }

    this.scene.choices = [
      { id: 'ask_news', label: 'Anything else I should know?', tone: 'curious' },
      { id: 'leave', label: 'I’ll be going.', tone: 'leave' }
    ];
    this.scene.kind = 'npc_player';
    return this.scene;
  }

  async replyFreeform(playerText: string): Promise<RpgDialogueScene | null> {
    if (!this.scene) return null;
    const npc = this.primaryNpc();
    if (!npc) return this.scene;
    this.scene.lines.push({ speakerId: 'player', text: playerText, emotion: 'neutral' });

    if (npc.aiTier === 'background') {
      this.scene.lines.push({ speakerId: npc.id, text: '…', emotion: 'neutral' });
      this.scene.lineIndex = this.scene.lines.length - 1;
      return this.scene;
    }

    const history = this.scene.lines.map(l => ({
      role: l.speakerId === 'player' ? 'user' : 'assistant',
      content: l.text
    }));
    const decision = await this.host.requestAiDialogue(npc, history, playerText);
    const line = decision.dialogue || '…';
    const emotion = normalizeEmotion(decision.emotion);
    this.scene.lines.push({ speakerId: npc.id, text: line, emotion });
    this.scene.lineIndex = this.scene.lines.length - 1;
    this.stampSpeakerEmotion(this.scene);
    if (decision.relationship_change) {
      applyRelationshipDelta(npc, 'player', decision.relationship_change, playerText.slice(0, 40), this.host.worldNow(), 'player');
    }
    if (/help|quest|dog|lost|shipment/i.test(playerText)) this.activateHelpQuest(npc);
    return this.scene;
  }

  beginPlayerTalk(remote: { id: string; username: string; skin: string; hair?: string; shirt: string }): RpgDialogueScene {
    const appearance: NpcAppearance = {
      skin: remote.skin,
      hair: remote.hair || '#3d2914',
      shirt: remote.shirt,
      pants: '#2c3e50'
    };
    this.scene = {
      id: `p2p_${remote.id}_${Date.now()}`,
      kind: 'player_player',
      importance: 'normal',
      speakers: [
        playerSpeaker(this.host),
        {
          id: remote.id,
          name: remote.username,
          username: remote.username,
          kind: 'remote',
          appearance,
          emotion: 'happy'
        }
      ],
      lines: [
        {
          speakerId: 'player',
          text: `Hey, ${remote.username}.`,
          emotion: 'happy'
        }
      ],
      lineIndex: 0,
      topic: 'player_chat',
      choices: []
    };
    return this.scene;
  }

  appendPlayerChat(fromId: string, text: string, emotion = 'neutral') {
    if (!this.scene || this.scene.kind !== 'player_player') return this.scene;
    this.scene.lines.push({ speakerId: fromId, text, emotion: normalizeEmotion(emotion) });
    this.scene.lineIndex = this.scene.lines.length - 1;
    this.stampSpeakerEmotion(this.scene);
    this.lastPlayerChat.push({ from: fromId, text, at: Date.now() });
    return this.scene;
  }

  handleMeeting(a: LivingNpc, b: LivingNpc, beat: { type: string; summary: string }) {
    if (beat.type === 'none' || beat.type === 'pass') return;
    if (this.scene) return;
    const key = [a.id, b.id].sort().join('|');
    const now = Date.now();
    if ((this.lastMeet.get(key) ?? 0) > now - 45000) return;
    this.lastMeet.set(key, now);

    if (shouldStartShipmentStory(a, b, this.host.events.events)) {
      const evt = ensureStolenShipmentEvent(this.host.npcs, this.host.events.events, this.host.worldNow());
      if (evt) this.host.events.push(evt);
    }

    const facts = collectWorldFacts(a, this.host.clock.state, this.host.events.events, this.host.quests, this.host.npcs);
    const script = buildNpcNpcScript(a, b, beat, facts, this.host.events.events);

    a.currentActivity = 'talking';
    b.currentActivity = 'talking';
    a.path = [];
    b.path = [];

    this.ambient = {
      id: `amb_${now}`,
      aId: a.id,
      bId: b.id,
      lines: script.lines,
      index: 0,
      topic: script.topic,
      importance: script.importance,
      nextLineAtMs: now + 400,
      overheard: false
    };
    this.setBubble(a.id, script.lines[0]?.text ?? '', now + 2800);
    this.host.pushLog(beat.summary);

    if (beat.type === 'argument') {
      this.pushBanner({
        id: `arg_${key}`,
        kind: 'relationship',
        title: 'Tempers flare',
        text: `${a.name} and ${b.name} are arguing.`
      });
    }
  }

  endScene(outcome = 'ended') {
    if (this.scene) this.persistScene(outcome);
    if (this.scene?.kind !== 'overhear') this.ambient = null;
    this.scene = null;
    this.cameraFocus = null;
    for (const n of this.host.npcs.values()) {
      if (n.currentActivity === 'talking') n.currentActivity = 'idle';
    }
  }

  consumeBanners(): StoryBanner[] {
    const out = this.banners;
    this.banners = [];
    return out;
  }

  private primaryNpc(): LivingNpc | null {
    if (!this.scene) return null;
    const id = this.scene.speakers.find(s => s.kind === 'npc')?.id;
    return id ? this.host.npcs.get(id) ?? null : null;
  }

  private stampSpeakerEmotion(scene: RpgDialogueScene) {
    const line = scene.lines[scene.lineIndex];
    if (!line) return;
    const sp = scene.speakers.find(s => s.id === line.speakerId);
    if (sp) sp.emotion = line.emotion;
  }

  private setBubble(actorId: string, text: string, untilMs: number) {
    this.bubbles = this.bubbles.filter(b => b.actorId !== actorId);
    this.bubbles.push({ actorId, text: text.slice(0, 42), untilMs });
  }

  private advanceAmbient(nowMs: number) {
    const amb = this.ambient;
    if (!amb) return;
    if (nowMs < amb.nextLineAtMs) return;
    amb.index += 1;
    if (amb.index >= amb.lines.length) {
      this.finishAmbient();
      return;
    }
    const line = amb.lines[amb.index];
    this.setBubble(line.speakerId, line.text, nowMs + 2800);
    amb.nextLineAtMs = nowMs + 2600;
  }

  private finishAmbient() {
    const amb = this.ambient;
    if (!amb) return;
    const a = this.host.npcs.get(amb.aId);
    const b = this.host.npcs.get(amb.bId);
    if (a && a.currentActivity === 'talking') a.currentActivity = 'idle';
    if (b && b.currentActivity === 'talking') b.currentActivity = 'idle';
    if (amb.importance >= 40) {
      this.conversations = recordConversation(this.conversations, {
        id: amb.id,
        participants: [amb.aId, amb.bId],
        location: {
          x: a?.currentLocation.worldX ?? 0,
          y: a?.currentLocation.worldY ?? 0
        },
        worldTime: {
          day: this.host.clock.state.day,
          hour: this.host.clock.state.hour,
          minute: this.host.clock.state.minute
        },
        topic: amb.topic,
        dialogue: amb.lines.map(l => l.text),
        emotions: amb.lines.map(l => l.emotion),
        choices: [],
        outcome: amb.overheard ? 'overheard' : 'npc_npc',
        memoriesCreated: amb.importance >= 70 ? ['rumor_shared'] : [],
        importance: amb.importance
      });
    }
    if (amb.topic === 'missing_shipment' && a && b) this.maybeOfferShipmentQuest(a, b);
    this.ambient = null;
  }

  private maybeOfferShipmentQuest(a: LivingNpc, b: LivingNpc) {
    const giver = a.id === 'npc_shop_kira' ? a : b.id === 'npc_shop_kira' ? b : a;
    if (!this.host.events.events.some(e => e.payload?.story === 'missing_shipment')) return;
    if (this.host.quests.some(q => q.objective.target === 'evt_missing_shipment')) return;
    const q = createShipmentQuest(giver, this.host.worldNow());
    this.host.quests.push(q);
    this.pushBanner({
      id: q.id,
      kind: 'quest',
      title: 'Quest available',
      text: q.title
    });
  }

  private activateHelpQuest(npc: LivingNpc) {
    let q = this.host.quests.find(x => x.giverId === npc.id && (x.status === 'available' || x.status === 'active'));
    if (!q) {
      q = createNeedQuest(npc, this.host.worldNow()) ?? undefined;
      if (q) this.host.quests.push(q);
    }
    if (!q && npc.id === 'npc_shop_kira') {
      this.maybeOfferShipmentQuest(npc, npc);
      q = this.host.quests.find(x => x.objective.target === 'evt_missing_shipment');
    }
    if (q) {
      q.status = 'active';
      this.scene?.lines.push({
        speakerId: npc.id,
        text: `Quest: ${q.title} — ${q.description}`,
        emotion: 'serious'
      });
      if (this.scene) this.scene.questId = q.id;
      this.pushBanner({ id: q.id, kind: 'quest', title: 'Quest started', text: q.title });
    }
  }

  private persistScene(outcome: string) {
    const scene = this.scene;
    if (!scene) return;
    const npc = this.primaryNpc();
    const importance = scene.importance === 'major' ? 80 : scene.importance === 'important' ? 55 : 30;
    this.conversations = recordConversation(this.conversations, {
      id: scene.id,
      participants: scene.speakers.map(s => s.id),
      location: { x: this.host.player.worldX, y: this.host.player.worldY },
      worldTime: {
        day: this.host.clock.state.day,
        hour: this.host.clock.state.hour,
        minute: this.host.clock.state.minute
      },
      topic: scene.topic,
      dialogue: scene.lines.map(l => `${l.speakerId}: ${l.text}`),
      emotions: scene.lines.map(l => l.emotion),
      choices: scene.choices?.map(c => c.id) ?? [],
      outcome,
      memoriesCreated: npc
        ? retrieveMemories(npc, { aboutPlayer: true, limit: 3 }).map(m => m.event)
        : [],
      importance
    });
  }

  private updateOverhearHint() {
    const near = this.nearbyTalking(5);
    if (!near) {
      this.overhearHint = null;
      return;
    }
    const a = this.host.npcs.get(near.aId);
    const b = this.host.npcs.get(near.bId);
    this.overhearHint = {
      npcId: near.aId,
      names: `${a?.name ?? 'Someone'} & ${b?.name ?? 'someone'}`
    };
  }

  private updateCamera() {
    if (this.scene && this.scene.importance !== 'normal') {
      const npc = this.primaryNpc();
      if (npc) {
        this.cameraFocus = {
          x: npc.currentLocation.worldX,
          y: npc.currentLocation.worldY,
          weight: this.scene.importance === 'major' ? 0.55 : 0.32
        };
        return;
      }
    }
    const amb = this.nearbyTalking(8);
    if (amb) {
      const a = this.host.npcs.get(amb.aId);
      if (a) {
        this.cameraFocus = { x: a.currentLocation.worldX, y: a.currentLocation.worldY, weight: 0.18 };
        return;
      }
    }
    this.cameraFocus = null;
  }

  private pushBanner(b: StoryBanner) {
    this.banners = [...this.banners.filter(x => x.id !== b.id), b].slice(-5);
  }
}

export type { DialogueChoice, DialogueLine };
