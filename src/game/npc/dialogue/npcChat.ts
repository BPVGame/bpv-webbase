/**
 * NPC↔NPC conversations with context — not random chatter.
 */

import { LivingNpc, WorldEvent } from '../types';
import { DialogueEmotion, DialogueLine } from './types';
import { voiceStyle } from './templates';
import { WorldFact } from './worldFacts';

export interface MeetingBeat {
  type: string;
  summary: string;
}

function line(id: string, text: string, emotion: DialogueEmotion): DialogueLine {
  return { speakerId: id, text, emotion };
}

export function buildNpcNpcScript(
  a: LivingNpc,
  b: LivingNpc,
  beat: MeetingBeat,
  facts: WorldFact[],
  events: WorldEvent[]
): { lines: DialogueLine[]; topic: string; importance: number } {
  const theft = events.find(e => e.kind === 'theft' || e.kind === 'crime');
  const rumor = a.knowledge.find(k => /ship|stolen|thief|dog|pip/i.test(k.content + k.topic));
  const styleA = voiceStyle(a.personality, a.emotions);
  const styleB = voiceStyle(b.personality, b.emotions);

  if (theft || rumor) {
    const fact = theft?.description || rumor?.content || 'Something was taken last night.';
    return {
      topic: 'missing_shipment',
      importance: 72,
      lines: [
        line(a.id, styleA === 'shy' ? 'Umm… did you hear about the merchant?' : 'Did you hear about the merchant?', 'serious'),
        line(b.id, styleB === 'suspicious' ? 'No. Speak plainly. What happened?' : 'No. What happened?', 'confused'),
        line(a.id, fact, 'angry'),
        line(b.id, styleB === 'funny' ? 'Well that’s a plot twist before breakfast.' : 'If that’s true, the roads aren’t safe.', 'thinking')
      ]
    };
  }

  if (beat.type === 'argument') {
    return {
      topic: 'argument',
      importance: 55,
      lines: [
        line(a.id, `${b.name} — I’ve had enough of this.`, 'angry'),
        line(b.id, `Then walk away. I’m not backing down.`, 'angry'),
        line(a.id, `This isn’t over.`, 'serious')
      ]
    };
  }

  if (beat.type === 'transaction') {
    return {
      topic: 'trade',
      importance: 35,
      lines: [
        line(a.id, 'That’ll cover it. Don’t forget your change.', 'neutral'),
        line(b.id, 'Thanks. I needed this.', 'happy')
      ]
    };
  }

  if (beat.type === 'investigate') {
    return {
      topic: 'watch',
      importance: 48,
      lines: [
        line(a.id, `${b.name}. You’re looking tense. Stay where I can see you.`, 'serious'),
        line(b.id, `I’m not looking for trouble.`, 'scared')
      ]
    };
  }

  const weather = facts.find(f => f.id === 'time');
  const bakery = facts.find(f => f.id === 'bakery');
  const gossip = a.knowledge[0]?.content || b.knowledge[0]?.content;

  if (gossip) {
    return {
      topic: a.knowledge[0]?.topic || 'gossip',
      importance: 40,
      lines: [
        line(a.id, `Between us — ${gossip}`, 'thinking'),
        line(b.id, styleB === 'suspicious' ? 'I’ll decide if I believe that.' : 'I’ll keep an ear out.', 'serious')
      ]
    };
  }

  if (bakery && a.id !== 'npc_baker_maria' && b.id !== 'npc_baker_maria') {
    return {
      topic: 'bakery',
      importance: 28,
      lines: [
        line(a.id, bakery.statement, 'neutral'),
        line(b.id, 'Good to know before I walk over.', 'happy')
      ]
    };
  }

  return {
    topic: 'small_talk',
    importance: 22,
    lines: [
      line(a.id, weather ? `Sky’s a mood today.` : `Busy streets.`, 'neutral'),
      line(b.id, `${a.name}. Stay safe out there.`, 'neutral')
    ]
  };
}
