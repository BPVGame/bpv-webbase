import { PersonalityTraits, EmotionalState, NpcNeeds } from './types';

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Build a coherent trait set — complementary traits stay consistent. */
export function createPersonality(partial: Partial<PersonalityTraits>): PersonalityTraits {
  const base: PersonalityTraits = {
    friendliness: 0.5,
    reservedness: 0.5,
    ambition: 0.5,
    laziness: 0.5,
    curiosity: 0.5,
    greed: 0.5,
    generosity: 0.5,
    suspicion: 0.5,
    humor: 0.5,
    seriousness: 0.5,
    bravery: 0.5,
    fearfulness: 0.5,
    kindness: 0.5,
    arrogance: 0.5,
    sociality: 0.5,
    introversion: 0.5,
    ...partial
  };
  // Soft consistency
  if (partial.friendliness !== undefined && partial.reservedness === undefined) {
    base.reservedness = clamp01(1 - base.friendliness * 0.7);
  }
  if (partial.greed !== undefined && partial.generosity === undefined) {
    base.generosity = clamp01(1 - base.greed);
  }
  if (partial.bravery !== undefined && partial.fearfulness === undefined) {
    base.fearfulness = clamp01(1 - base.bravery);
  }
  if (partial.sociality !== undefined && partial.introversion === undefined) {
    base.introversion = clamp01(1 - base.sociality);
  }
  if (partial.humor !== undefined && partial.seriousness === undefined) {
    base.seriousness = clamp01(1 - base.humor * 0.8);
  }
  return base;
}

export function dominantTraits(p: PersonalityTraits, top = 3): string[] {
  const entries: Array<[string, number]> = [
    ['friendly', p.friendliness],
    ['reserved', p.reservedness],
    ['ambitious', p.ambition],
    ['lazy', p.laziness],
    ['curious', p.curiosity],
    ['greedy', p.greed],
    ['generous', p.generosity],
    ['suspicious', p.suspicion],
    ['funny', p.humor],
    ['serious', p.seriousness],
    ['brave', p.bravery],
    ['fearful', p.fearfulness],
    ['kind', p.kindness],
    ['arrogant', p.arrogance],
    ['social', p.sociality],
    ['introverted', p.introversion]
  ];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k]) => k);
}

export function defaultEmotions(): EmotionalState {
  return {
    happiness: 55,
    anger: 5,
    fear: 8,
    sadness: 10,
    stress: 15,
    trust: 50,
    excitement: 30
  };
}

export function defaultNeeds(): NpcNeeds {
  return {
    hunger: 30,
    energy: 70,
    social: 40,
    safety: 80,
    money: 50,
    health: 90,
    entertainment: 45,
    work: 40
  };
}

/**
 * Personality modifiers for decisions (multipliers / biases).
 * Used by planner & economy — not just dialogue flavor.
 */
export function personalityDecisionBias(p: PersonalityTraits): {
  workDrive: number;
  helpStrangers: number;
  riskTolerance: number;
  priceMarkup: number;
  socialDrive: number;
  saveRate: number;
} {
  return {
    workDrive: clamp01(0.35 + p.ambition * 0.5 - p.laziness * 0.35),
    helpStrangers: clamp01(p.friendliness * 0.45 + p.kindness * 0.45 - p.suspicion * 0.3),
    riskTolerance: clamp01(p.bravery * 0.6 - p.fearfulness * 0.45 + 0.2),
    priceMarkup: 0.85 + p.greed * 0.45 - p.generosity * 0.25,
    socialDrive: clamp01(p.sociality * 0.6 - p.introversion * 0.35 + 0.2),
    saveRate: clamp01(0.3 + p.greed * 0.4 + p.ambition * 0.15 - p.generosity * 0.2)
  };
}

export function applyEmotionDelta(e: EmotionalState, delta: Partial<EmotionalState>): EmotionalState {
  const next = { ...e };
  for (const key of Object.keys(delta) as Array<keyof EmotionalState>) {
    const v = delta[key];
    if (typeof v === 'number') next[key] = clamp100(next[key] + v);
  }
  return next;
}

export function moodFromEmotions(e: EmotionalState): string {
  const ranked: Array<[string, number]> = [
    ['angry', e.anger],
    ['afraid', e.fear],
    ['sad', e.sadness],
    ['stressed', e.stress],
    ['excited', e.excitement],
    ['happy', e.happiness]
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  const [label, score] = ranked[0];
  if (score < 40) return 'calm';
  return label;
}
