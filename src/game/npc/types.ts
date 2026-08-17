/**
 * Living AI NPC — core data model.
 * Game engine is authoritative; AI only proposes structured intents.
 */

export type NpcId = string;
export type ActorId = NpcId | 'player';

export type SimulationLod = 'full' | 'reduced' | 'abstract' | 'dormant';

export type NpcOccupation =
  | 'mayor'
  | 'merchant'
  | 'card_master'
  | 'scout'
  | 'baker'
  | 'fisher'
  | 'guard'
  | 'farmer'
  | 'innkeeper'
  | 'scholar'
  | 'courier'
  | 'artisan';

/** Continuous personality traits in [0, 1]. */
export interface PersonalityTraits {
  friendliness: number;
  reservedness: number;
  ambition: number;
  laziness: number;
  curiosity: number;
  greed: number;
  generosity: number;
  suspicion: number;
  humor: number;
  seriousness: number;
  bravery: number;
  fearfulness: number;
  kindness: number;
  arrogance: number;
  sociality: number;
  introversion: number;
}

export interface EmotionalState {
  happiness: number;
  anger: number;
  fear: number;
  sadness: number;
  stress: number;
  trust: number;
  excitement: number;
}

export interface NpcNeeds {
  hunger: number;
  energy: number;
  social: number;
  safety: number;
  money: number;
  health: number;
  entertainment: number;
  work: number;
}

export type MemoryKind = 'short_term' | 'long_term' | 'relationship' | 'world' | 'personal';

export interface NpcMemory {
  id: string;
  kind: MemoryKind;
  subject: ActorId | string;
  event: string;
  description: string;
  importance: number;
  emotion: string;
  timestamp: number;
  location?: { x: number; y: number };
  participants: ActorId[];
  significant?: boolean;
}

export interface RelationshipScores {
  trust: number;
  friendship: number;
  respect: number;
  fear: number;
  anger: number;
}

export interface NpcRelationship {
  targetId: ActorId;
  role: 'player' | 'family' | 'friend' | 'coworker' | 'enemy' | 'merchant' | 'neighbor' | 'other';
  scores: RelationshipScores;
  history: Array<{ reason: string; delta: Partial<RelationshipScores>; at: number }>;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  value: number;
  tags?: string[];
}

export interface ScheduleBlock {
  startMinute: number;
  endMinute: number;
  activity: string;
  locationKey: string;
  flexible?: boolean;
}

export interface NpcKnowledgeFact {
  id: string;
  topic: string;
  content: string;
  confidence: number;
  source: ActorId | 'witness' | 'rumor' | 'occupation';
  learnedAt: number;
}

export interface NpcGoal {
  id: string;
  description: string;
  priority: number;
  status: 'active' | 'completed' | 'failed' | 'paused';
  relatedQuestId?: string;
}

export interface NpcIntention {
  intent: string;
  reason: string;
  target?: string;
  priority: number;
  emotion?: string;
  source: 'simulation' | 'rules' | 'planner' | 'ellofive' | 'player';
  issuedAt: number;
}

export interface WorldPosition {
  worldX: number;
  worldY: number;
  chunkX: number;
  chunkY: number;
}

export interface NpcAppearance {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export interface LivingNpc {
  id: NpcId;
  name: string;
  age: number;
  occupation: NpcOccupation;
  home: WorldPosition;
  workplace: WorldPosition;
  personality: PersonalityTraits;
  background: string;
  biography: string;
  currentLocation: WorldPosition;
  currentActivity: string;
  currentMood: string;
  needs: NpcNeeds;
  goals: NpcGoal[];
  memories: NpcMemory[];
  relationships: NpcRelationship[];
  reputation: number;
  inventory: InventoryItem[];
  money: number;
  schedule: ScheduleBlock[];
  knowledge: NpcKnowledgeFact[];
  secrets: string[];
  fears: string[];
  preferences: string[];
  currentIntention: NpcIntention | null;
  emotions: EmotionalState;
  appearance: NpcAppearance;
  health: number;
  /** Path queue in world tiles (engine executes movement). */
  path: Array<{ x: number; y: number }>;
  lastDecisionAt: number;
  lastAiCallAt: number;
  lastAiLatencyMs: number;
  lastAiTokens?: number;
  simLod: SimulationLod;
  lifeEvents: Array<{ id: string; title: string; at: number; detail: string }>;
}

export interface PlayerSnapshot {
  id: ActorId;
  username: string;
  worldX: number;
  worldY: number;
  reputation: number;
  coins: number;
  inventory: InventoryItem[];
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';

export interface WorldTimeState {
  day: number;
  dateLabel: string;
  minuteOfDay: number;
  hour: number;
  minute: number;
  season: Season;
  weather: WeatherKind;
  /** Real ms when this clock was synced (for interpolation). */
  syncedAtMs: number;
  /** Game minutes per real second. */
  timeScale: number;
}

export type WorldEventKind =
  | 'festival'
  | 'market_day'
  | 'rain'
  | 'storm'
  | 'npc_death'
  | 'npc_birth'
  | 'shop_opening'
  | 'shop_closing'
  | 'crime'
  | 'theft'
  | 'fire'
  | 'quest_completed'
  | 'quest_failed'
  | 'rare_item'
  | 'monster_attack'
  | 'player_reputation'
  | 'political'
  | 'economic'
  | 'rumor';

export interface WorldEvent {
  id: string;
  kind: WorldEventKind;
  title: string;
  description: string;
  importance: number;
  location?: { x: number; y: number; radius?: number };
  startedAt: number;
  endsAt?: number;
  participants?: ActorId[];
  payload?: Record<string, unknown>;
}

export interface DynamicQuest {
  id: string;
  giverId: NpcId;
  title: string;
  description: string;
  reason: string;
  objective: { type: string; target: string; qty?: number };
  rewardCoins: number;
  relationshipReward: Partial<RelationshipScores>;
  status: 'available' | 'active' | 'completed' | 'failed';
  createdAt: number;
  /** Must reference real world entities. */
  anchors: { locations?: string[]; items?: string[]; npcs?: NpcId[] };
}

export interface StructuredAiDecision {
  intent: string;
  reason: string;
  target?: string | null;
  priority: number;
  emotion?: string | null;
  dialogue?: string | null;
  relationship_change?: Partial<RelationshipScores> | null;
  tool_calls?: Array<{ tool: string; args: Record<string, unknown> }>;
}

export interface AiCallMeta {
  at: number;
  latencyMs: number;
  tokens?: number;
  ok: boolean;
  error?: string;
  decision?: StructuredAiDecision;
}
