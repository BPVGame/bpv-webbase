import { SavedServer } from './types';

const KEY = 'bpv_saved_servers_v1';

export function loadSavedServers(): SavedServer[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedServer[];
    return Array.isArray(list) ? list.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function saveSavedServers(list: SavedServer[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    /* quota */
  }
}

export function upsertSavedServer(list: SavedServer[], server: SavedServer): SavedServer[] {
  const next = [server, ...list.filter(s => s.id !== server.id && !(s.address === server.address && s.port === server.port))];
  saveSavedServers(next);
  return next;
}
