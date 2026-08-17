/**
 * Persist only meaningful conversations — not every greeting.
 */

import { ConversationRecord } from './types';

const KEY = 'bpv_conversations_v1';
const MAX = 48;
const MIN_IMPORTANCE = 40;

export function isMeaningfulConversation(importance: number, outcome: string): boolean {
  if (importance >= MIN_IMPORTANCE) return true;
  return /quest|promise|theft|argument|relationship|overhear/i.test(outcome);
}

export function loadConversations(): ConversationRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationRecord[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: ConversationRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function recordConversation(
  existing: ConversationRecord[],
  rec: ConversationRecord
): ConversationRecord[] {
  if (!isMeaningfulConversation(rec.importance, rec.outcome)) return existing;
  const next = [rec, ...existing.filter(x => x.id !== rec.id)];
  if (next.length > MAX) next.length = MAX;
  saveConversations(next);
  return next;
}
