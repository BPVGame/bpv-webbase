/**
 * Emoji Design Fish Card catalog — collectibles players can earn in IsoEarth.
 */

import { FishCardData } from '../components/FishCardView';

export type CardEarn = 'starter' | 'pack' | 'rare_pack' | 'tournament' | 'mission';

export interface FishCardDef {
  id: number;
  card_slug: string;
  name: string;
  rarity: FishCardData['rarity'];
  attack: number;
  defense: number;
  speed: number;
  description: string;
  emoji: string;
  howToEarn: string;
  earn: CardEarn;
}

export const FISH_CARD_CATALOG: FishCardDef[] = [
  {
    id: 101,
    card_slug: 'neon_guppy',
    name: 'Neon Pixel Guppy',
    rarity: 'Common',
    attack: 25,
    defense: 18,
    speed: 35,
    description: 'A swift pixelated freshwater guppy glowing in cyan neon.',
    emoji: '🐟',
    howToEarn: 'Starter collection',
    earn: 'starter'
  },
  {
    id: 102,
    card_slug: 'cyber_bass',
    name: 'Cyber Bass',
    rarity: 'Uncommon',
    attack: 45,
    defense: 38,
    speed: 28,
    description: 'Aggressive robotic bass with laser fins and armored scales.',
    emoji: '🐠',
    howToEarn: 'Starter collection',
    earn: 'starter'
  },
  {
    id: 103,
    card_slug: 'plasma_salmon',
    name: 'Plasma Salmon',
    rarity: 'Rare',
    attack: 75,
    defense: 62,
    speed: 55,
    description: 'River runner glowing with plasma energy.',
    emoji: '🐡',
    howToEarn: 'Starter collection',
    earn: 'starter'
  },
  {
    id: 104,
    card_slug: 'quantum_kraken',
    name: 'Quantum Kraken',
    rarity: 'Legendary',
    attack: 140,
    defense: 125,
    speed: 95,
    description: 'Deep-sea mythic organism capable of warping space.',
    emoji: '🐙',
    howToEarn: 'Starter collection',
    earn: 'starter'
  },
  {
    id: 105,
    card_slug: 'emoji_destin',
    name: 'Emoji Destin',
    rarity: 'Epic',
    attack: 88,
    defense: 70,
    speed: 80,
    description: 'Holographic destin fish born from IsoEarth tides.',
    emoji: '✨',
    howToEarn: 'Starter collection',
    earn: 'starter'
  },
  {
    id: 106,
    card_slug: 'coral_minnow',
    name: 'Coral Minnow',
    rarity: 'Common',
    attack: 18,
    defense: 14,
    speed: 42,
    description: 'Tiny reef spark that schools along harbor sand.',
    emoji: '🫧',
    howToEarn: 'Open a Card Pack or walk 500m',
    earn: 'pack'
  },
  {
    id: 107,
    card_slug: 'meadow_trout',
    name: 'Meadow Trout',
    rarity: 'Common',
    attack: 22,
    defense: 20,
    speed: 30,
    description: 'Park-stream trout with clover-scale freckles.',
    emoji: '🌿',
    howToEarn: 'Complete City Explorer mission',
    earn: 'mission'
  },
  {
    id: 108,
    card_slug: 'garden_goldfish',
    name: 'Garden Goldfish',
    rarity: 'Common',
    attack: 20,
    defense: 24,
    speed: 22,
    description: 'A plump pond friend that follows lantern light.',
    emoji: '🥇',
    howToEarn: 'Talk to local NPCs',
    earn: 'mission'
  },
  {
    id: 109,
    card_slug: 'lantern_koi',
    name: 'Lantern Koi',
    rarity: 'Uncommon',
    attack: 36,
    defense: 40,
    speed: 26,
    description: 'Festival koi that trails paper-lantern sparks.',
    emoji: '🎏',
    howToEarn: 'Card Pack or Market Day tournament',
    earn: 'pack'
  },
  {
    id: 110,
    card_slug: 'candy_clownfish',
    name: 'Candy Clownfish',
    rarity: 'Uncommon',
    attack: 34,
    defense: 28,
    speed: 38,
    description: 'Striped performer from Pixel Harbor docks.',
    emoji: '🤡',
    howToEarn: 'Open a Card Pack',
    earn: 'pack'
  },
  {
    id: 111,
    card_slug: 'bubble_betta',
    name: 'Bubble Betta',
    rarity: 'Uncommon',
    attack: 40,
    defense: 22,
    speed: 44,
    description: 'Flared fins that trap whole conversations in bubbles.',
    emoji: '💭',
    howToEarn: 'Open a Card Pack',
    earn: 'pack'
  },
  {
    id: 112,
    card_slug: 'dock_crab',
    name: 'Dockside Crab',
    rarity: 'Uncommon',
    attack: 48,
    defense: 52,
    speed: 18,
    description: 'Pinchy crate-guard of the harbor piers.',
    emoji: '🦀',
    howToEarn: 'Join Harbor Masters League',
    earn: 'tournament'
  },
  {
    id: 113,
    card_slug: 'tide_angelfish',
    name: 'Tide Angelfish',
    rarity: 'Rare',
    attack: 62,
    defense: 58,
    speed: 50,
    description: 'Haloed reef dancer that follows the evening tide.',
    emoji: '😇',
    howToEarn: 'Tournament prize or Rare Pack',
    earn: 'tournament'
  },
  {
    id: 114,
    card_slug: 'pixel_piranha',
    name: 'Pixel Piranha',
    rarity: 'Rare',
    attack: 82,
    defense: 40,
    speed: 60,
    description: 'Jagged bite of the river shallows — handle with gloves.',
    emoji: '🦷',
    howToEarn: 'Join Pixel Championship Cup',
    earn: 'tournament'
  },
  {
    id: 115,
    card_slug: 'storm_eel',
    name: 'Storm Eel',
    rarity: 'Rare',
    attack: 70,
    defense: 48,
    speed: 72,
    description: 'Lightning coiled into a river-body after rain.',
    emoji: '⚡',
    howToEarn: 'Rare Pack or Storm Circuit tournament',
    earn: 'rare_pack'
  },
  {
    id: 116,
    card_slug: 'aurora_ray',
    name: 'Aurora Ray',
    rarity: 'Rare',
    attack: 58,
    defense: 66,
    speed: 64,
    description: 'Northern lights stretched across a manta wing.',
    emoji: '🛸',
    howToEarn: 'Open a Rare Pack',
    earn: 'rare_pack'
  },
  {
    id: 117,
    card_slug: 'spark_seahorse',
    name: 'Spark Seahorse',
    rarity: 'Rare',
    attack: 44,
    defense: 72,
    speed: 36,
    description: 'Curled courier of tournament invitations.',
    emoji: '🦄',
    howToEarn: 'Complete Challenger mission',
    earn: 'mission'
  },
  {
    id: 118,
    card_slug: 'ink_octopus',
    name: 'Ink Octopus',
    rarity: 'Epic',
    attack: 92,
    defense: 84,
    speed: 68,
    description: 'Writes rumors across the harbor in living ink.',
    emoji: '🦑',
    howToEarn: 'Win an Arena tournament',
    earn: 'tournament'
  },
  {
    id: 119,
    card_slug: 'ember_shark',
    name: 'Ember Shark',
    rarity: 'Epic',
    attack: 110,
    defense: 70,
    speed: 78,
    description: 'Furnace-blooded hunter of the tournament circuit.',
    emoji: '🦈',
    howToEarn: 'Rare Pack (low odds)',
    earn: 'rare_pack'
  },
  {
    id: 120,
    card_slug: 'tournament_tuna',
    name: 'Champion Tuna',
    rarity: 'Epic',
    attack: 96,
    defense: 88,
    speed: 74,
    description: 'Belted champion of the Pixel Championship Cup.',
    emoji: '🏅',
    howToEarn: 'Win Pixel Championship Cup',
    earn: 'tournament'
  },
  {
    id: 121,
    card_slug: 'lunar_jellyfish',
    name: 'Lunar Jelly',
    rarity: 'Legendary',
    attack: 120,
    defense: 110,
    speed: 90,
    description: 'Moon-phase drift that silences storms around it.',
    emoji: '🌙',
    howToEarn: 'Win Night Tide Invitational',
    earn: 'tournament'
  },
  {
    id: 122,
    card_slug: 'void_leviathan',
    name: 'Void Leviathan',
    rarity: 'Mythic',
    attack: 168,
    defense: 150,
    speed: 112,
    description: 'The abyss looking back — only one trainer in a hundred packs.',
    emoji: '🐉',
    howToEarn: 'Rare Pack (mythic odds)',
    earn: 'rare_pack'
  }
];

export const STARTER_SLUGS = FISH_CARD_CATALOG.filter(c => c.earn === 'starter').map(c => c.card_slug);

export const PACK_COST = 120;
export const RARE_PACK_COST = 380;

const PACK_WEIGHT: Record<FishCardData['rarity'], number> = {
  Common: 42,
  Uncommon: 28,
  Rare: 18,
  Epic: 8,
  Legendary: 3.5,
  Mythic: 0.5
};

export function defToOwned(def: FishCardDef, level = 1): FishCardData {
  const scale = level - 1;
  return {
    id: def.id,
    card_slug: def.card_slug,
    name: def.name,
    rarity: def.rarity,
    level,
    attack: def.attack + scale * 12,
    defense: def.defense + scale * 10,
    speed: def.speed + scale * 8,
    description: def.description,
    emoji: def.emoji
  };
}

export function starterCards(): FishCardData[] {
  return FISH_CARD_CATALOG.filter(c => c.earn === 'starter').map(c =>
    defToOwned(c, c.card_slug === 'neon_guppy' ? 2 : c.card_slug === 'quantum_kraken' ? 3 : 1)
  );
}

export function findCardDef(slug: string): FishCardDef | undefined {
  return FISH_CARD_CATALOG.find(c => c.card_slug === slug);
}

/** Weighted pull from cards the player does not yet own (falls back to owned upgrades). */
export function rollPackCard(ownedSlugs: Set<string>, rare: boolean): FishCardDef {
  const pool = FISH_CARD_CATALOG.filter(c => {
    if (ownedSlugs.has(c.card_slug)) return false;
    if (!rare && (c.rarity === 'Mythic' || c.rarity === 'Legendary')) return false;
    return true;
  });
  const use = pool.length ? pool : FISH_CARD_CATALOG;
  const boosted = rare
    ? use
    : use.filter(c => c.rarity !== 'Mythic');
  let total = 0;
  const weights = boosted.map(c => {
    let w = PACK_WEIGHT[c.rarity];
    if (rare && (c.rarity === 'Epic' || c.rarity === 'Legendary' || c.rarity === 'Mythic')) w *= 2.2;
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < boosted.length; i++) {
    r -= weights[i];
    if (r <= 0) return boosted[i];
  }
  return boosted[boosted.length - 1];
}
