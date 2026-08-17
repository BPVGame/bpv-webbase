import { AiTier, LivingNpc, NpcOccupation } from '../types';
import { createPersonality, defaultEmotions, defaultNeeds } from '../personality';
import { scheduleForOccupation, posFromWorld } from '../worldClock';
import { makeItem } from '../economy';
import { addKnowledge, occupationKnowledge } from '../knowledge';
import { DISTRICT_ORIGINS } from '../../iso/WorldGen';
import { CHUNK_SIZE } from '../../iso/WorldGen';

function npcBase(
  id: string,
  name: string,
  age: number,
  occupation: NpcOccupation,
  homeXY: { x: number; y: number },
  workXY: { x: number; y: number },
  personality: Parameters<typeof createPersonality>[0],
  background: string,
  biography: string,
  appearance: LivingNpc['appearance'],
  money: number,
  extras?: Partial<LivingNpc>
): LivingNpc {
  const home = posFromWorld(homeXY.x, homeXY.y, CHUNK_SIZE);
  const workplace = posFromWorld(workXY.x, workXY.y, CHUNK_SIZE);
  const npc: LivingNpc = {
    id,
    name,
    age,
    occupation,
    home,
    workplace,
    personality: createPersonality(personality),
    background,
    biography,
    currentLocation: { ...home },
    currentActivity: 'idle',
    currentMood: 'calm',
    needs: defaultNeeds(),
    goals: [],
    memories: [],
    relationships: [],
    reputation: 50,
    inventory: [],
    money,
    schedule: scheduleForOccupation(occupation),
    knowledge: [],
    secrets: [],
    fears: [],
    preferences: [],
    currentIntention: null,
    emotions: defaultEmotions(),
    appearance,
    health: 100,
    path: [],
    lastDecisionAt: 0,
    lastAiCallAt: 0,
    lastAiLatencyMs: 0,
    simLod: 'abstract',
    aiTier: extras?.aiTier ?? defaultAiTier(occupation),
    lifeEvents: [],
    ...extras
  };
  for (const k of occupationKnowledge(occupation)) {
    addKnowledge(npc, k.topic, k.content, 'occupation', 0, 0.9);
  }
  return npc;
}

function defaultAiTier(occupation: NpcOccupation): AiTier {
  if (occupation === 'mayor' || occupation === 'merchant' || occupation === 'baker' || occupation === 'card_master' || occupation === 'scholar') {
    return 'important';
  }
  if (occupation === 'farmer' || occupation === 'courier' || occupation === 'artisan') return 'background';
  return 'normal';
}

/** Seed distinct important NPCs at district capitals — never identical personalities. */
export function seedLivingNpcs(): LivingNpc[] {
  const cc = DISTRICT_ORIGINS.city_center;
  const res = DISTRICT_ORIGINS.residential;
  const park = DISTRICT_ORIGINS.central_park;
  const harbor = DISTRICT_ORIGINS.pixel_harbor;
  const shop = DISTRICT_ORIGINS.shopping_outpost;
  const arena = DISTRICT_ORIGINS.tournament_arena;

  const mayor = npcBase(
    'npc_mayor_pixel',
    'Mayor Pixel',
    54,
    'mayor',
    { x: cc.x, y: cc.y },
    { x: cc.x + 3, y: cc.y - 1 },
    {
      friendliness: 0.75,
      ambition: 0.7,
      seriousness: 0.65,
      kindness: 0.7,
      sociality: 0.8,
      greed: 0.25,
      suspicion: 0.35
    },
    'Elected steward of City Center plaza.',
    'Mayor Pixel keeps Havenbrook’s warp stones calibrated and greets travelers.',
    { skin: '#f3d5b5', hair: '#2a1a10', shirt: '#3a5a8c', pants: '#1e293b' },
    180,
    {
      secrets: ['The east warp flickers during storms.'],
      preferences: ['festivals', 'orderly plazas'],
      fears: ['civic unrest']
    }
  );

  const finn = npcBase(
    'npc_card_finn',
    'Card Master Finn',
    31,
    'card_master',
    { x: cc.x - 4, y: cc.y + 2 },
    { x: cc.x - 2, y: cc.y + 2 },
    {
      curiosity: 0.85,
      humor: 0.7,
      friendliness: 0.65,
      ambition: 0.6,
      greed: 0.4,
      arrogance: 0.35
    },
    'Fish Card tutor and tournament scout.',
    'Finn grades decks with a wink and never forgets a rare pull.',
    { skin: '#e8c4a8', hair: '#5b3a1a', shirt: '#7c3aed', pants: '#312e81' },
    95,
    {
      inventory: [makeItem('card_pack', 'Starter Card Pack', 3, 25, ['trade'])],
      preferences: ['rare cards', 'clever plays']
    }
  );

  const maria = npcBase(
    'npc_baker_maria',
    'Maria Dough',
    42,
    'baker',
    { x: res.x + 1, y: res.y },
    { x: res.x - 2, y: res.y + 1 },
    {
      kindness: 0.9,
      friendliness: 0.85,
      generosity: 0.8,
      suspicion: 0.2,
      laziness: 0.15,
      ambition: 0.45
    },
    'Neighborhood baker who rises before dawn.',
    'Maria’s cinnamon buns fund half the residential gossip network.',
    { skin: '#d4a574', hair: '#1a1a1a', shirt: '#f59e0b', pants: '#78350f' },
    60,
    {
      inventory: [
        makeItem('bun', 'Cinnamon Bun', 6, 8, ['food']),
        makeItem('dog_whistle', 'Dog Whistle', 1, 5, ['lost', 'quest'])
      ],
      goals: [
        {
          id: 'find_dog',
          description: 'Find her missing dog Pip',
          priority: 0.9,
          status: 'active'
        }
      ],
      fears: ['Pip never coming home'],
      preferences: ['honest customers']
    }
  );

  const marina = npcBase(
    'npc_scout_marina',
    'Scout Marina',
    27,
    'scout',
    { x: park.x, y: park.y },
    { x: park.x + 5, y: park.y - 3 },
    {
      curiosity: 0.9,
      bravery: 0.75,
      sociality: 0.55,
      reservedness: 0.4,
      ambition: 0.5,
      fearfulness: 0.25
    },
    'Forest path scout mapping Central Park trails.',
    'Marina leaves cairns for lost travelers and tracks river floods.',
    { skin: '#c68642', hair: '#0f172a', shirt: '#166534', pants: '#14532d' },
    40,
    { preferences: ['quiet woods', 'clear weather'], fears: ['getting cornered'] }
  );

  const harborMaster = npcBase(
    'npc_harbor_reo',
    'Reo Dockhand',
    38,
    'fisher',
    { x: harbor.x, y: harbor.y - 2 },
    { x: harbor.x + 2, y: harbor.y + 1 },
    {
      seriousness: 0.7,
      reservedness: 0.65,
      greed: 0.35,
      bravery: 0.6,
      friendliness: 0.4,
      suspicion: 0.55
    },
    'Dock worker counting crates at Pixel Harbor.',
    'Reo trusts the tide more than strangers — but pays fairly.',
    { skin: '#f5d0c5', hair: '#334155', shirt: '#0ea5e9', pants: '#1e3a5f' },
    70,
    {
      inventory: [makeItem('fish_ration', 'Smoked Fish', 4, 10, ['food'])],
      secrets: ['A sealed crate washed up with a glowing card seal.']
    }
  );

  const shopkeep = npcBase(
    'npc_shop_kira',
    'Kira Vale',
    29,
    'merchant',
    { x: shop.x, y: shop.y },
    { x: shop.x + 1, y: shop.y },
    {
      greed: 0.75,
      ambition: 0.8,
      friendliness: 0.55,
      suspicion: 0.6,
      arrogance: 0.45,
      generosity: 0.25
    },
    'Outpost merchant optimizing every coin.',
    'Kira opens early on market day and never undersells without a reason.',
    { skin: '#fde68a', hair: '#7c2d12', shirt: '#db2777', pants: '#4a044e' },
    220,
    {
      inventory: [
        makeItem('potion', 'Herb Tonic', 5, 18, ['trade']),
        makeItem('rope', 'Travel Rope', 2, 12, ['trade']),
        makeItem('snack', 'Trail Snack', 8, 6, ['food', 'trade'])
      ]
    }
  );

  const guard = npcBase(
    'npc_guard_jon',
    'Guard Jon',
    34,
    'guard',
    { x: cc.x + 6, y: cc.y + 4 },
    { x: cc.x + 2, y: cc.y },
    {
      bravery: 0.8,
      suspicion: 0.7,
      seriousness: 0.75,
      friendliness: 0.35,
      fearfulness: 0.2,
      kindness: 0.45
    },
    'Plaza guard watching cobble roads.',
    'Jon investigates raised voices and keeps a ledger of troublemakers.',
    { skin: '#e7c6a3', hair: '#111827', shirt: '#475569', pants: '#1f2937' },
    55,
    { fears: ['failing a watch'], preferences: ['clear sightlines'] }
  );

  const scholar = npcBase(
    'npc_scholar_yen',
    'Yen Quill',
    47,
    'scholar',
    { x: arena.x - 3, y: arena.y },
    { x: arena.x, y: arena.y },
    {
      curiosity: 0.95,
      introversion: 0.7,
      seriousness: 0.6,
      humor: 0.35,
      arrogance: 0.4,
      sociality: 0.3
    },
    'Arena archivist recording tournament lore.',
    'Yen prefers books to crowds but lights up when asked about history.',
    { skin: '#f5e6d3', hair: '#4b5563', shirt: '#a78bfa', pants: '#3730a3' },
    48,
    { preferences: ['quiet study', 'accurate rumors'] }
  );

  const innkeeper = npcBase(
    'npc_inn_bella',
    'Bella Hearth',
    51,
    'innkeeper',
    { x: res.x - 5, y: res.y + 3 },
    { x: res.x - 5, y: res.y + 3 },
    {
      friendliness: 0.8,
      sociality: 0.85,
      kindness: 0.75,
      greed: 0.35,
      laziness: 0.3,
      humor: 0.6
    },
    'Runs the residential hearth-inn.',
    'Bella hears every rumor twice and serves stew either way.',
    { skin: '#f0c4a8', hair: '#6b21a8', shirt: '#fb7185', pants: '#9f1239' },
    110,
    {
      inventory: [makeItem('stew', 'Hearth Stew', 5, 9, ['food'])],
      preferences: ['evening chatter']
    }
  );

  const farmer = npcBase(
    'npc_farmer_tom',
    'Tom Furrow',
    45,
    'farmer',
    { x: park.x - 12, y: park.y + 8 },
    { x: park.x - 10, y: park.y + 10 },
    {
      laziness: 0.35,
      kindness: 0.65,
      reservedness: 0.55,
      greed: 0.3,
      ambition: 0.35,
      fearfulness: 0.4
    },
    'Farms the meadow fringe beyond the park.',
    'Tom knows soil and weather, not harbor politics.',
    { skin: '#c4a484', hair: '#92400e', shirt: '#ca8a04', pants: '#451a03' },
    35
  );

  const lina = npcBase(
    'npc_courier_lina',
    'Lina Drift',
    22,
    'courier',
    { x: cc.x + 2, y: cc.y + 2 },
    { x: cc.x + 5, y: cc.y },
    {
      sociality: 0.8,
      friendliness: 0.7,
      curiosity: 0.6,
      reservedness: 0.25,
      humor: 0.45
    },
    'Plaza courier who never walks in a straight line.',
    'Lina trades greetings as often as parcels.',
    { skin: '#f3d5b5', hair: '#9a3412', shirt: '#38bdf8', pants: '#0f172a' },
    22,
    { aiTier: 'background', preferences: ['shortcuts'] }
  );

  const poe = npcBase(
    'npc_artisan_poe',
    'Poe Wink',
    26,
    'artisan',
    { x: cc.x + 1, y: cc.y + 3 },
    { x: cc.x - 1, y: cc.y + 2 },
    {
      introversion: 0.75,
      reservedness: 0.7,
      kindness: 0.6,
      suspicion: 0.4,
      friendliness: 0.35
    },
    'Quiet sign-painter at the plaza edge.',
    'Poe notices everything and says almost nothing.',
    { skin: '#e8c4a8', hair: '#1e1b4b', shirt: '#a3e635', pants: '#365314' },
    18,
    { aiTier: 'background', fears: ['crowds'] }
  );

  return [mayor, finn, maria, marina, harborMaster, shopkeep, guard, scholar, innkeeper, farmer, lina, poe];
}
