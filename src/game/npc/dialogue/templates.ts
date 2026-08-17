/**
 * Pre-authored + personality-flavored dialogue. Used before ElloFive.
 */

import { LivingNpc, PlayerSnapshot, PersonalityTraits, EmotionalState } from '../types';
import { retrieveMemories } from '../memory';
import { getOrCreateRelationship } from '../relationships';
import { DialogueChoice, DialogueEmotion, DialogueLine } from './types';
import { normalizeEmotion } from './portraits';
import { WorldFact } from './worldFacts';

export type VoiceStyle = 'friendly' | 'suspicious' | 'funny' | 'angry' | 'shy' | 'serious' | 'greedy';

export function voiceStyle(p: PersonalityTraits, emotions: EmotionalState): VoiceStyle {
  if (emotions.anger > 55) return 'angry';
  if (p.suspicion > 0.62 && p.friendliness < 0.5) return 'suspicious';
  if (p.humor > 0.62) return 'funny';
  if (p.introversion > 0.6 && p.reservedness > 0.5) return 'shy';
  if (p.greed > 0.68) return 'greedy';
  if (p.seriousness > 0.62) return 'serious';
  if (p.friendliness > 0.55) return 'friendly';
  return 'serious';
}

export function emotionFromNpc(npc: LivingNpc): DialogueEmotion {
  const e = npc.emotions;
  if (e.anger > 55) return 'angry';
  if (e.fear > 55) return 'scared';
  if (e.sadness > 50) return 'sad';
  if (e.excitement > 60) return 'excited';
  if (e.happiness > 70) return 'happy';
  return normalizeEmotion(npc.currentMood);
}

function flavor(style: VoiceStyle, lines: Record<VoiceStyle, string>): string {
  return lines[style];
}

export function greetingLine(npc: LivingNpc, player: PlayerSnapshot, facts: WorldFact[]): { text: string; emotion: DialogueEmotion } {
  const style = voiceStyle(npc.personality, npc.emotions);
  const rel = getOrCreateRelationship(npc, 'player', 'player');
  const promise = retrieveMemories(npc, { event: 'player_promised_to_help', aboutPlayer: true, limit: 1 });
  const weather = facts.find(f => f.id === 'time')?.statement.includes('rain') || facts.find(f => f.topic === 'rain');

  if (promise[0]) {
    return {
      emotion: rel.scores.trust > 40 ? 'serious' : 'sad',
      text: flavor(style, {
        friendly: `You said you would help me, ${player.username}… I still need you.`,
        suspicious: `You promised help. People who promise and vanish are the ones I watch.`,
        funny: `Look who remembered! You did say you’d help. I’m holding you to it.`,
        angry: `You said you’d help. Don’t waste my time.`,
        shy: `Umm… you… you said you would help me…`,
        serious: `You gave your word that you would help. I remember.`,
        greedy: `You promised aid. I expect you to follow through.`
      })
    };
  }

  if (rel.scores.friendship > 55) {
    return {
      emotion: 'happy',
      text: flavor(style, {
        friendly: `Hey! Good to see you again, ${player.username}!`,
        suspicious: `You’re back. Fine. What is it this time?`,
        funny: `The legend returns. Did the forest finally scare you?`,
        angry: `Oh. You.`,
        shy: `Oh! You’re here… hi.`,
        serious: `${player.username}. I hoped you’d pass through.`,
        greedy: `Ah, a familiar purse. What are you buying?`
      })
    };
  }

  const bakery = facts.find(f => f.id === 'bakery');
  if (npc.occupation === 'baker' && bakery) {
    return {
      emotion: bakery.statement.includes('open') ? 'happy' : 'sad',
      text: bakery.statement.includes('open')
        ? flavor(style, {
            friendly: `The ovens are hot — come in, ${player.username}.`,
            suspicious: `Shop’s open. Pay at the counter.`,
            funny: `If you can smell cinnamon, you’re in the right place.`,
            angry: `We’re open. Don’t loiter.`,
            shy: `I… I just pulled a tray. If you want one…`,
            serious: `The bakery is open. What do you need?`,
            greedy: `Fresh buns. Fair coin. That’s the deal.`
          })
        : flavor(style, {
            friendly: `I’m away from the shop — the bakery’s closed for now.`,
            suspicious: `Bakery’s closed. I’m not there.`,
            funny: `Ovens are off. Even bakers wander.`,
            angry: `Shop’s closed. Come back when I’m working.`,
            shy: `The bakery isn’t open right now… sorry.`,
            serious: `The bakery is closed. I’m not at the shop.`,
            greedy: `Closed means closed. No free samples.`
          })
    };
  }

  if (weather) {
    return {
      emotion: 'serious',
      text: flavor(style, {
        friendly: `Stay dry out there, ${player.username}.`,
        suspicious: `Rain makes people careless. Watch your step.`,
        funny: `You want to go into THAT weather? Bold choice.`,
        angry: `Miserable sky. Say what you need.`,
        shy: `It’s… a bit much out, isn’t it?`,
        serious: `Weather’s turned. Keep to the roads.`,
        greedy: `Rainy days still cost coin. What’ll it be?`
      })
    };
  }

  return {
    emotion: emotionFromNpc(npc),
    text: flavor(style, {
      friendly: `Hey! Good to see you, ${player.username}. I’m ${npc.name}.`,
      suspicious: `I don’t know you. Why are you asking me that? …What do you want?`,
      funny: `You walked all this way just to talk to ${npc.name}? Bold choice.`,
      angry: `Leave me alone — unless this matters.`,
      shy: `Umm… I… I’m ${npc.name}. Did you need something?`,
      serious: `${npc.name}. State your business.`,
      greedy: `Time is coin. Make it worth my while.`
    })
  };
}

export function playerChoicesFor(npc: LivingNpc, topic: string, hasQuest: boolean): DialogueChoice[] {
  const styleHint = voiceStyle(npc.personality, npc.emotions);
  const choices: DialogueChoice[] = [
    {
      id: 'ask_life',
      label: 'How have you been?',
      tone: 'kind',
      memoryEvent: 'player_asked_after_npc',
      relationship: { friendship: 2, trust: 1 }
    },
    {
      id: 'ask_news',
      label: 'Heard any news around here?',
      tone: 'curious',
      memoryEvent: 'player_asked_news'
    }
  ];

  if (hasQuest || npc.goals.some(g => g.status === 'active')) {
    choices.unshift({
      id: 'offer_help',
      label: 'I can help. What happened?',
      tone: 'brave',
      memoryEvent: 'player_promised_to_help',
      relationship: { friendship: 4, trust: 3, respect: 2 }
    });
    if (styleHint === 'greedy' || npc.personality.greed > 0.5) {
      choices.push({
        id: 'ask_pay',
        label: 'How much will you pay me?',
        tone: 'greedy',
        memoryEvent: 'player_asked_for_pay',
        relationship: { friendship: -1, respect: -1 }
      });
    }
  }

  choices.push({
    id: 'busy',
    label: 'Sorry, I was busy.',
    tone: 'busy',
    relationship: { friendship: -1 }
  });
  choices.push({ id: 'leave', label: 'Leave', tone: 'leave' });
  return choices.slice(0, 4);
}

export function npcReplyToChoice(
  npc: LivingNpc,
  choiceId: string,
  player: PlayerSnapshot,
  facts: WorldFact[]
): { text: string; emotion: DialogueEmotion } {
  const style = voiceStyle(npc.personality, npc.emotions);
  const news = facts.find(f => f.topic === 'theft' || f.topic === 'crime' || f.topic === 'rumor') || facts.find(f => f.id.startsWith('evt_'));
  const bakery = facts.find(f => f.id === 'bakery');

  if (choiceId === 'offer_help') {
    const goal = npc.goals.find(g => g.status === 'active');
    return {
      emotion: 'surprised',
      text: goal
        ? flavor(style, {
            friendly: `You actually came to help? ${goal.description}.`,
            suspicious: `Help? We’ll see. ${goal.description}.`,
            funny: `A volunteer! ${goal.description}. Try not to make it worse.`,
            angry: `Fine. ${goal.description}. Don’t mess it up.`,
            shy: `You… you’d help? ${goal.description}.`,
            serious: `Then listen. ${goal.description}.`,
            greedy: `Help is good. Results are better. ${goal.description}.`
          })
        : flavor(style, {
            friendly: `That’s kind. Stay close — something’s off in town.`,
            suspicious: `If you’re useful, I’ll tell you more.`,
            funny: `Hero complex? I can work with that.`,
            angry: `Then keep up.`,
            shy: `Thank you… I didn’t expect that.`,
            serious: `Understood. I’ll keep you informed.`,
            greedy: `Kindness is nice. Coin is nicer. But I’ll take both.`
          })
    };
  }

  if (choiceId === 'ask_pay') {
    return {
      emotion: npc.personality.greed > 0.5 ? 'laughing' : 'serious',
      text: flavor(style, {
        friendly: `I can spare a little coin if you succeed.`,
        suspicious: `Pay after results.`,
        funny: `A mercenary! At least you’re honest.`,
        angry: `You’ll get what you’re worth.`,
        shy: `I… I don’t have much, but I’ll try.`,
        serious: `A modest reward. Do the work first.`,
        greedy: `We’ll negotiate after I see competence.`
      })
    };
  }

  if (choiceId === 'ask_news') {
    if (news) {
      return { emotion: 'serious', text: news.statement };
    }
    if (bakery && npc.occupation !== 'baker') {
      return { emotion: 'thinking', text: bakery.statement };
    }
    return {
      emotion: 'thinking',
      text: flavor(style, {
        friendly: `Quiet day, mostly. People are just living their lives.`,
        suspicious: `If I knew something sharp, I wouldn’t hand it to a stranger.`,
        funny: `News? A pigeon stole a bun. Riveting.`,
        angry: `Nothing you need to hear.`,
        shy: `I… I think I saw something near the river. Maybe.`,
        serious: `No verified trouble on my watch.`,
        greedy: `News costs extra. Weather’s free: look up.`
      })
    };
  }

  if (choiceId === 'ask_life') {
    return {
      emotion: emotionFromNpc(npc),
      text: flavor(style, {
        friendly: `Busy, but alright. ${npc.currentActivity.replace(/_/g, ' ')} keeps me moving.`,
        suspicious: `That’s my business.`,
        funny: `Living the dream. The dream involves sore feet.`,
        angry: `Worse, now that you’re asking.`,
        shy: `I’m… okay. I think.`,
        serious: `Work continues. That’s enough.`,
        greedy: `Margins could be better.`
      })
    };
  }

  if (choiceId === 'busy') {
    return {
      emotion: 'serious',
      text: flavor(style, {
        friendly: `No worry — I’ll be here.`,
        suspicious: `Hnh. Typical.`,
        funny: `The classic “I was busy.” I’ll invoice you later.`,
        angry: `Then go.`,
        shy: `Oh… okay.`,
        serious: `Very well.`,
        greedy: `Busy people still pay. Next time.`
      })
    };
  }

  return { text: `${npc.name} nods.`, emotion: 'neutral' };
}

export function backgroundChatter(npc: LivingNpc): DialogueLine {
  return {
    speakerId: npc.id,
    emotion: 'neutral',
    text: npc.occupation === 'farmer' ? 'Soil’s holding.' : npc.occupation === 'courier' ? 'Parcels don’t wait.' : '…'
  };
}
