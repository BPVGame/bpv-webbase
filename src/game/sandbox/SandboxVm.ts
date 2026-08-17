/**
 * Authoritative sandbox VM — player Governor + optional AI co-governor.
 * Land/flags/decrees are validated here; the client only proposes actions.
 */

import {
  Decree,
  GovernmentState,
  LandClaim,
  LandTileId,
  LAND_BRUSHES,
  SandboxRole,
  SandboxSnapshot,
  WorldFlag
} from './types';
import { emptySandbox, loadSandbox, saveSandbox } from './persist';

const MAX_CLAIMS = 2500;
const MAX_FLAGS = 80;
const MAX_RADIUS = 4;

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export class SandboxVm {
  snap: SandboxSnapshot = emptySandbox();
  private listeners = new Set<() => void>();

  boot() {
    this.snap = loadSandbox() ?? emptySandbox();
    this.emit();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private persist() {
    saveSandbox(this.snap);
    this.emit();
  }

  foundState(opts: {
    name: string;
    motto: string;
    founder: string;
    colorA: string;
    colorB: string;
    col: number;
    row: number;
    role?: SandboxRole;
  }): { ok: true; government: GovernmentState } | { ok: false; error: string } {
    const name = opts.name.trim().slice(0, 32);
    if (name.length < 2) return { ok: false, error: 'name_too_short' };
    if (this.snap.government.founded) return { ok: false, error: 'already_founded' };
    const role = opts.role ?? 'governor';
    if (role === 'visitor') return { ok: false, error: 'forbidden' };
    this.snap.government = {
      founded: true,
      name,
      motto: opts.motto.trim().slice(0, 80),
      colorA: opts.colorA || '#3a5a8c',
      colorB: opts.colorB || '#e8d4a8',
      capitalCol: Math.round(opts.col),
      capitalRow: Math.round(opts.row),
      founder: opts.founder.slice(0, 32),
      foundedAt: Date.now()
    };
    this.issueDecree({
      title: 'Founding charter',
      text: `${name} is proclaimed. Capital at ${opts.col},${opts.row}.`,
      author: role
    });
    this.plantFlag({
      name: `${name} capital`,
      col: opts.col,
      row: opts.row,
      role
    });
    this.persist();
    return { ok: true, government: this.snap.government };
  }

  claimLand(opts: {
    col: number;
    row: number;
    radius?: number;
    tileId?: LandTileId;
    role?: SandboxRole;
  }): { ok: true; added: number } | { ok: false; error: string } {
    const role = opts.role ?? 'governor';
    if (role === 'visitor') return { ok: false, error: 'forbidden' };
    if (!this.snap.government.founded) return { ok: false, error: 'no_state' };
    const r = Math.max(0, Math.min(MAX_RADIUS, Math.floor(opts.radius ?? 1)));
    const tileId: LandTileId = LAND_BRUSHES.includes(opts.tileId as LandTileId)
      ? (opts.tileId as LandTileId)
      : 'plaza';
    const col = Math.round(opts.col);
    const row = Math.round(opts.row);
    let added = 0;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (this.snap.claims.length >= MAX_CLAIMS) break;
        const c = col + dx;
        const rw = row + dy;
        const key = `${c},${rw}`;
        const existing = this.snap.claims.findIndex(x => `${x.col},${x.row}` === key);
        const claim: LandClaim = {
          id: existing >= 0 ? this.snap.claims[existing].id : id('land'),
          col: c,
          row: rw,
          tileId,
          claimedBy: role
        };
        if (existing >= 0) this.snap.claims[existing] = claim;
        else {
          this.snap.claims.push(claim);
          added += 1;
        }
      }
    }
    this.persist();
    return { ok: true, added };
  }

  plantFlag(opts: {
    name: string;
    col: number;
    row: number;
    role?: SandboxRole;
  }): { ok: true; flag: WorldFlag } | { ok: false; error: string } {
    const role = opts.role ?? 'governor';
    if (role === 'visitor') return { ok: false, error: 'forbidden' };
    if (!this.snap.government.founded && role !== 'governor') return { ok: false, error: 'no_state' };
    if (this.snap.flags.length >= MAX_FLAGS) return { ok: false, error: 'too_many_flags' };
    const col = Math.round(opts.col);
    const row = Math.round(opts.row);
    if (this.snap.flags.some(f => f.col === col && f.row === row)) {
      return { ok: false, error: 'flag_exists' };
    }
    const flag: WorldFlag = {
      id: id('flag'),
      name: (opts.name || this.snap.government.name || 'Banner').slice(0, 28),
      col,
      row,
      colorA: this.snap.government.colorA,
      colorB: this.snap.government.colorB,
      plantedBy: role,
      plantedAt: Date.now()
    };
    this.snap.flags.push(flag);
    this.persist();
    return { ok: true, flag };
  }

  issueDecree(opts: { title: string; text: string; author?: SandboxRole }): { ok: true } | { ok: false; error: string } {
    const author = opts.author ?? 'governor';
    if (author === 'visitor') return { ok: false, error: 'forbidden' };
    const decree: Decree = {
      id: id('law'),
      title: opts.title.trim().slice(0, 48) || 'Decree',
      text: opts.text.trim().slice(0, 240),
      at: Date.now(),
      author
    };
    this.snap.decrees.unshift(decree);
    if (this.snap.decrees.length > 80) this.snap.decrees.length = 80;
    this.persist();
    return { ok: true };
  }

  setAiEnabled(on: boolean) {
    this.snap.aiEnabled = on;
    this.persist();
  }

  /** Isolated AI tick — never trusts client-invented inventory/XP. */
  tickAi(player: { col: number; row: number }): { acted: boolean; note: string } {
    this.snap.tick += 1;
    if (!this.snap.aiEnabled) {
      this.persist();
      return { acted: false, note: 'ai_paused' };
    }
    if (!this.snap.government.founded) {
      this.persist();
      return { acted: false, note: 'awaiting_charter' };
    }
    const g = this.snap.government;
    const roll = (this.snap.tick * 17 + player.col + player.row) % 10;
    if (roll < 4) {
      const col = g.capitalCol + ((this.snap.tick % 7) - 3);
      const row = g.capitalRow + (((this.snap.tick * 3) % 7) - 3);
      this.claimLand({ col, row, radius: 0, tileId: roll === 0 ? 'lamp' : 'plaza', role: 'ai' });
      return { acted: true, note: 'ai_claimed_land' };
    }
    if (roll === 7 && this.snap.flags.length < 12) {
      const col = g.capitalCol + ((this.snap.tick % 9) - 4);
      const row = g.capitalRow + 2;
      const planted = this.plantFlag({ name: `${g.name} post`, col, row, role: 'ai' });
      if (planted.ok) return { acted: true, note: 'ai_planted_flag' };
    }
    if (roll === 9 && this.snap.tick % 8 === 0) {
      this.issueDecree({
        title: 'Civic works',
        text: `The AI steward extends ${g.name} roads and lamps near the capital.`,
        author: 'ai'
      });
      return { acted: true, note: 'ai_decree' };
    }
    this.persist();
    return { acted: false, note: 'idle' };
  }

  tileAt(col: number, row: number): LandTileId | null {
    const c = this.snap.claims.find(x => x.col === col && x.row === row);
    return c?.tileId ?? null;
  }

  flagAt(col: number, row: number): WorldFlag | null {
    return this.snap.flags.find(f => f.col === col && f.row === row) ?? null;
  }
}

export const sandboxVm = new SandboxVm();
