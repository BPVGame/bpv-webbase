/**
 * Cinematic RPG dialogue — Korean-style presentation model.
 * World sprites stay on the map; portraits appear only during talk.
 */

import type { DialogueEmotion, NpcAppearance } from '../types';

export type { DialogueEmotion };

export type DialogueKind = 'npc_player' | 'npc_npc' | 'player_player' | 'story' | 'overhear';

export type DialogueImportance = 'normal' | 'important' | 'major';

export type SpeakerKind = 'npc' | 'player' | 'remote';

export type ChoiceTone = 'kind' | 'curious' | 'greedy' | 'busy' | 'brave' | 'leave' | 'join';

export interface DialogueSpeaker {
  id: string;
  name: string;
  username?: string;
  kind: SpeakerKind;
  appearance: NpcAppearance;
  emotion: DialogueEmotion;
}

export interface DialogueLine {
  speakerId: string;
  text: string;
  emotion: DialogueEmotion;
}

export interface DialogueChoice {
  id: string;
  label: string;
  tone: ChoiceTone;
  /** Memory event written if this choice is taken (meaningful only). */
  memoryEvent?: string;
  /** Relationship delta applied to the speaking NPC vs player. */
  relationship?: { friendship?: number; trust?: number; respect?: number; anger?: number };
}

export interface RpgDialogueScene {
  id: string;
  kind: DialogueKind;
  importance: DialogueImportance;
  speakers: DialogueSpeaker[];
  lines: DialogueLine[];
  lineIndex: number;
  choices?: DialogueChoice[];
  joinable?: boolean;
  overheard?: boolean;
  topic: string;
  questId?: string;
  banner?: string;
}

export interface ConversationRecord {
  id: string;
  participants: string[];
  location: { x: number; y: number };
  worldTime: { day: number; hour: number; minute: number };
  topic: string;
  dialogue: string[];
  emotions: DialogueEmotion[];
  choices: string[];
  outcome: string;
  memoriesCreated: string[];
  importance: number;
}

export interface SpeechBubble {
  actorId: string;
  text: string;
  untilMs: number;
}

export interface StoryBanner {
  id: string;
  kind: 'quest' | 'event' | 'rumor' | 'relationship';
  title: string;
  text: string;
}

export interface AmbientTalk {
  id: string;
  aId: string;
  bId: string;
  lines: DialogueLine[];
  index: number;
  topic: string;
  importance: number;
  nextLineAtMs: number;
  overheard: boolean;
}
