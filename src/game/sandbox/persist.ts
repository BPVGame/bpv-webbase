import { LandClaim, SandboxSnapshot, WorldFlag, Decree, DEFAULT_GOVERNMENT } from './types';

const KEY = 'bpv_sandbox_v1';

export function loadSandbox(): SandboxSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SandboxSnapshot;
    if (!p || typeof p !== 'object') return null;
    return {
      government: { ...DEFAULT_GOVERNMENT, ...(p.government || {}) },
      claims: Array.isArray(p.claims) ? p.claims.slice(0, 4000) : [],
      flags: Array.isArray(p.flags) ? p.flags.slice(0, 200) : [],
      decrees: Array.isArray(p.decrees) ? p.decrees.slice(0, 80) : [],
      aiEnabled: Boolean(p.aiEnabled),
      tick: Number(p.tick) || 0
    };
  } catch {
    return null;
  }
}

export function saveSandbox(snap: SandboxSnapshot): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function emptySandbox(): SandboxSnapshot {
  return {
    government: { ...DEFAULT_GOVERNMENT },
    claims: [] as LandClaim[],
    flags: [] as WorldFlag[],
    decrees: [] as Decree[],
    aiEnabled: true,
    tick: 0
  };
}
