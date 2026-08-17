import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SandboxVm } from '../SandboxVm';
import { ChunkWorld } from '../../iso/ChunkWorld';

describe('SandboxVm', () => {
  it('lets a governor found a state, claim land, and plant a flag', () => {
    const vm = new SandboxVm();
    const denied = vm.claimLand({ col: 0, row: 0, role: 'governor' });
    assert.equal(denied.ok, false);
    const found = vm.foundState({
      name: 'Havenbrook',
      motto: 'By river and road',
      founder: 'Ash',
      colorA: '#2244aa',
      colorB: '#eedd99',
      col: 2,
      row: 3
    });
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.equal(found.government.founded, true);
    assert.ok(vm.snap.flags.some(f => f.col === 2 && f.row === 3));
    const land = vm.claimLand({ col: 4, row: 4, radius: 1, tileId: 'plaza', role: 'governor' });
    assert.equal(land.ok, true);
    if (!land.ok) return;
    assert.ok(land.added >= 1);
    assert.equal(vm.tileAt(4, 4), 'plaza');
  });

  it('rejects visitor civic commands and client-invented extra flags on one tile', () => {
    const vm = new SandboxVm();
    vm.foundState({
      name: 'Pixelia',
      motto: '',
      founder: 'Mina',
      colorA: '#111',
      colorB: '#eee',
      col: 0,
      row: 0
    });
    const vis = vm.claimLand({ col: 1, row: 1, role: 'visitor' });
    assert.equal(vis.ok, false);
    const first = vm.plantFlag({ name: 'North', col: 8, row: 8, role: 'governor' });
    const dup = vm.plantFlag({ name: 'North 2', col: 8, row: 8, role: 'governor' });
    assert.equal(first.ok, true);
    assert.equal(dup.ok, false);
  });

  it('AI tick only mutates after a charter exists', () => {
    const vm = new SandboxVm();
    const before = vm.tickAi({ col: 0, row: 0 });
    assert.equal(before.note, 'awaiting_charter');
    vm.foundState({
      name: 'Lumina',
      motto: 'Light',
      founder: 'Yuhina',
      colorA: '#abc',
      colorB: '#def',
      col: 0,
      row: 0
    });
    vm.setAiEnabled(true);
    const after = vm.tickAi({ col: 0, row: 0 });
    assert.ok(typeof after.note === 'string');
  });

  it('ChunkWorld overlays sit on top of procedural tiles', () => {
    const world = new ChunkWorld('city_center');
    const base = world.getTile(3, 5);
    world.setOverlay(3, 5, 'plaza');
    assert.equal(world.getTile(3, 5), 'plaza');
    world.setOverlay(3, 5, null);
    assert.equal(world.getTile(3, 5), base);
  });
});
