/**
 * Offline profile + local progression. Never used as authority while online.
 */

import { OfflineProfile } from './types';

const KEY = 'bpv_offline_profile_v1';

export function defaultOfflineProfile(username = 'Trainer'): OfflineProfile {
  return {
    username,
    level: 1,
    xp: 0,
    coins: 250,
    avatar_skin: '#f3d5b5',
    avatar_hair: '#3d2914',
    avatar_shirt: '#3a5a8c',
    avatar_pants: '#2c3e50',
    realm: 'city_center',
    savedAt: Date.now()
  };
}

export function loadOfflineProfile(): OfflineProfile | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as OfflineProfile;
    if (!p?.username) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveOfflineProfile(profile: OfflineProfile): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify({ ...profile, savedAt: Date.now() }));
  } catch {
    /* quota */
  }
}

export function hasOfflineSave(): boolean {
  return loadOfflineProfile() != null;
}
