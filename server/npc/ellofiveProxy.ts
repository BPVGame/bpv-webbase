/**
 * Server-side ElloFive / ChatBase proxy.
 * Mirrors Neuriy ChatBase contract: POST {ELLOFIVE_URL}/v1/chat
 * Secrets never leave the server.
 */

const ELLOFIVE_URL = (process.env.ELLOFIVE_URL || process.env.NEURIY_CHATBASE_URL || '').replace(/\/$/, '');
const ELLOFIVE_MODEL = process.env.ELLOFIVE_MODEL || 'ellofive';
const ELLOFIVE_TIMEOUT_MS = Number(process.env.ELLOFIVE_TIMEOUT_MS || 12000);

export interface ElloFiveChatResult {
  output: string;
  model: string;
  latencyMs: number;
  degraded: boolean;
  tokens?: number;
  error?: string;
}

/** Deterministic structured fallback when ElloFive is offline. */
function degradedOutput(kind: 'decide' | 'dialogue', system: string, user: string): string {
  if (kind === 'dialogue') {
    const nameMatch = system.match(/You are ([^,]+),/);
    const name = nameMatch?.[1] ?? 'A local';
    return JSON.stringify({
      intent: 'TALK',
      emotion: 'calm',
      dialogue: `${name} greets you warmly. (AI offline — deterministic reply)`,
      relationship_change: { friendship: 1, trust: 0 },
      reason: 'fallback',
      priority: 0.4,
      target: null
    });
  }
  const hungry = /Hungry|money|food/i.test(user);
  return JSON.stringify({
    intent: hungry ? 'WORK_FIRST' : 'IDLE',
    reason: hungry ? 'Fallback: earn then eat' : 'Fallback idle',
    target: hungry ? 'workplace' : null,
    priority: hungry ? 0.8 : 0.3,
    emotion: 'determined',
    dialogue: null
  });
}

export async function ellofiveChat(opts: {
  kind: 'decide' | 'dialogue';
  system: string;
  user: string;
  model?: string;
}): Promise<ElloFiveChatResult> {
  const started = Date.now();

  if (!ELLOFIVE_URL) {
    return {
      output: degradedOutput(opts.kind, opts.system, opts.user),
      model: 'fallback',
      latencyMs: Date.now() - started,
      degraded: true,
      error: 'ELLOFIVE_URL not configured'
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ELLOFIVE_TIMEOUT_MS);

  try {
    const res = await fetch(`${ELLOFIVE_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model || ELLOFIVE_MODEL,
        messages: [
          { role: 'system', content: opts.system.slice(0, 6000) },
          { role: 'user', content: opts.user.slice(0, 6000) }
        ],
        message: opts.user.slice(0, 2000)
      }),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ElloFive ${res.status}: ${detail.slice(0, 160)}`);
    }

    const data = (await res.json()) as {
      output?: string;
      message?: { content?: string };
      model?: string;
      usage?: { total_tokens?: number };
    };

    const output = data.output || data.message?.content || '';
    if (!output) throw new Error('empty ElloFive output');

    return {
      output,
      model: data.model || ELLOFIVE_MODEL,
      latencyMs: Date.now() - started,
      degraded: false,
      tokens: data.usage?.total_tokens
    };
  } catch (err) {
    return {
      output: degradedOutput(opts.kind, opts.system, opts.user),
      model: 'fallback',
      latencyMs: Date.now() - started,
      degraded: true,
      error: err instanceof Error ? err.message : 'ellofive_unavailable'
    };
  } finally {
    clearTimeout(timer);
  }
}
