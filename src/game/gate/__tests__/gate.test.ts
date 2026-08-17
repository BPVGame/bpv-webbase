import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameGate } from '../GameGate';
import { parseDirectAddress } from '../types';
import { defaultOfflineProfile } from '../localProfile';

describe('GameGate', () => {
  it('boots to the main menu instead of the world', () => {
    const g = new GameGate();
    assert.equal(g.phase, 'boot');
    g.boot();
    assert.equal(g.phase, 'main_menu');
    assert.equal(g.mode, null);
  });

  it('loads offline without a session token', () => {
    const g = new GameGate();
    g.boot();
    g.chooseOffline();
    assert.equal(g.mode, 'offline');
    assert.equal(g.phase, 'offline_load');
    g.offlineProfile = defaultOfflineProfile('Ash');
    g.confirmOfflineWorld();
    assert.equal(g.phase, 'playing');
    assert.equal(g.sessionToken, null);
  });

  it('refuses to mix online play into offline without leaving', () => {
    const g = new GameGate();
    g.boot();
    g.mode = 'online';
    g.phase = 'playing';
    const r = g.requestModeSwitch('offline');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.needLeaveServer, true);
  });

  it('parses direct connect addresses', () => {
    assert.deepEqual(parseDirectAddress('play.example.com:7777'), { address: 'play.example.com', port: 7777 });
    assert.equal(parseDirectAddress('not a host'), null);
    assert.equal(parseDirectAddress('host:99999'), null);
  });

  it('does not persist offline profile while online', () => {
    const g = new GameGate();
    g.mode = 'online';
    g.offlineProfile = defaultOfflineProfile('A');
    g.persistOffline({ coins: 9999 });
    assert.equal(g.offlineProfile.coins, 250);
  });
});
