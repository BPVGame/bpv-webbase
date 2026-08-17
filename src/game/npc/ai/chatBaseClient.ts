/**
 * Client → BPV backend → Neuriy ChatBase / ElloFive.
 * Never put API keys in the browser; the server proxies ElloFive.
 */

import { StructuredAiDecision } from '../types';
import { parseStructuredDecision, validateDecision } from './structured';
import { fallbackDecision, fallbackDialogue } from './prompts';
import { LivingNpc, PlayerSnapshot } from '../types';

export interface AiProxyResult {
  ok: boolean;
  raw?: string;
  decision: StructuredAiDecision;
  latencyMs: number;
  tokens?: number;
  error?: string;
  source: 'ellofive' | 'fallback';
}

function apiBase(): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BPV_API_URL) {
    return (import.meta as any).env.VITE_BPV_API_URL;
  }
  return '';
}

export async function requestNpcAi(opts: {
  kind: 'decide' | 'dialogue';
  system: string;
  user: string;
  npc: LivingNpc;
  player: PlayerSnapshot;
  situation?: string;
  signal?: AbortSignal;
}): Promise<AiProxyResult> {
  const started = Date.now();
  const base = apiBase();
  // Relative URL works when Vite proxies /api; otherwise hit local server.
  const url = base ? `${base.replace(/\/$/, '')}/api/npc/ai` : '/api/npc/ai';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: opts.kind,
        system: opts.system,
        user: opts.user,
        npcId: opts.npc.id
      }),
      signal: opts.signal
    });

    if (!res.ok) throw new Error(`AI proxy HTTP ${res.status}`);
    const data = (await res.json()) as {
      output?: string;
      latencyMs?: number;
      tokens?: number;
      degraded?: boolean;
    };

    const raw = data.output ?? '';
    const parsed = parseStructuredDecision(raw);
    if (!parsed) {
      const fb =
        opts.kind === 'dialogue'
          ? fallbackDialogue(opts.npc, opts.player)
          : fallbackDecision(opts.npc, opts.situation ?? '');
      return {
        ok: false,
        raw,
        decision: fb,
        latencyMs: data.latencyMs ?? Date.now() - started,
        error: 'unstructured_response',
        source: 'fallback'
      };
    }

    return {
      ok: !data.degraded,
      raw,
      decision: validateDecision(parsed),
      latencyMs: data.latencyMs ?? Date.now() - started,
      tokens: data.tokens,
      source: data.degraded ? 'fallback' : 'ellofive'
    };
  } catch (err) {
    const fb =
      opts.kind === 'dialogue'
        ? fallbackDialogue(opts.npc, opts.player)
        : fallbackDecision(opts.npc, opts.situation ?? opts.user);
    return {
      ok: false,
      decision: fb,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'ai_unavailable',
      source: 'fallback'
    };
  }
}
