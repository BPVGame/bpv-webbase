import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WorldAuthority } from '../authority';
import { loadDedicatedConfig } from '../config';

describe('WorldAuthority', () => {
  it('rejects teleport hacks and client-granted XP', () => {
    const world = new WorldAuthority(loadDedicatedConfig());
    const join = world.join({ username: 'Ash' });
    assert.equal(join.ok, true);
    if (!join.ok) return;
    const id = join.session.id;
    const badMove = world.applyAction(id, 'move', { col: 80, row: 80 });
    assert.equal(badMove.ok, false);
    const xp = world.applyAction(id, 'grant_xp', { amount: 9999 });
    assert.equal(xp.ok, false);
    const inv = world.applyAction(id, 'set_inventory', { items: [] });
    assert.equal(inv.ok, false);
  });

  it('spends coins only from the server balance', () => {
    const world = new WorldAuthority(loadDedicatedConfig());
    const join = world.join({ username: 'Mina' });
    assert.equal(join.ok, true);
    if (!join.ok) return;
    const broke = world.applyAction(join.session.id, 'spend_coins', { amount: 9999 });
    assert.equal(broke.ok, false);
    const ok = world.applyAction(join.session.id, 'spend_coins', { amount: 10 });
    assert.equal(ok.ok, true);
    assert.equal(ok.session?.coins, 240);
  });

  it('validates admin roles server-side', () => {
    const world = new WorldAuthority({ ...loadDedicatedConfig(), owner_username: 'Owner' });
    const owner = world.join({ username: 'Owner' });
    const player = world.join({ username: 'Alex' });
    assert.ok(owner.ok && player.ok);
    if (!owner.ok || !player.ok) return;
    assert.equal(owner.session.role, 'owner');
    assert.equal(player.session.role, 'player');
    const denied = world.applyAction(player.session.id, 'admin_kick', { username: 'Owner' });
    assert.equal(denied.ok, false);
    const kicked = world.applyAction(owner.session.id, 'admin_kick', { username: 'Alex' });
    assert.equal(kicked.ok, true);
  });

  it('rejects joins without the configured password', () => {
    const world = new WorldAuthority({ ...loadDedicatedConfig(), join_password: 'secret', owner_username: 'Owner' });
    const denied = world.join({ username: 'Alex' });
    assert.equal(denied.ok, false);
    const ok = world.join({ username: 'Alex', password: 'secret' });
    assert.equal(ok.ok, true);
  });

  it('does not grant owner to the first joiner when an owner username is configured', () => {
    const world = new WorldAuthority({ ...loadDedicatedConfig(), owner_username: 'Owner' });
    const first = world.join({ username: 'Alex' });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.session.role, 'player');
  });
});
