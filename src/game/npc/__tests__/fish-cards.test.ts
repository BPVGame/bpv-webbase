import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FISH_CARD_CATALOG, starterCards, rollPackCard, findCardDef, PACK_COST } from '../../../data/fishCards';

describe('fish card catalog', () => {
  it('has more than the five starter cards', () => {
    assert.ok(FISH_CARD_CATALOG.length >= 18);
    assert.equal(starterCards().length, 5);
    assert.ok(PACK_COST > 0);
  });

  it('rollPackCard returns a catalog definition', () => {
    const owned = new Set(starterCards().map(c => c.card_slug));
    const def = rollPackCard(owned, false);
    assert.ok(findCardDef(def.card_slug));
    assert.notEqual(def.rarity, 'Mythic');
  });
});
