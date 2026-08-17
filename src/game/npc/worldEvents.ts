import { WorldEvent, WorldEventKind, LivingNpc } from './types';

let eventSeq = 0;

export function createWorldEvent(
  partial: Omit<WorldEvent, 'id'> & { id?: string }
): WorldEvent {
  eventSeq += 1;
  return {
    id: partial.id ?? `evt_${Date.now()}_${eventSeq}`,
    kind: partial.kind,
    title: partial.title,
    description: partial.description,
    importance: partial.importance,
    location: partial.location,
    startedAt: partial.startedAt,
    endsAt: partial.endsAt,
    participants: partial.participants,
    payload: partial.payload
  };
}

export class WorldEventBus {
  events: WorldEvent[] = [];

  push(event: WorldEvent) {
    this.events.unshift(event);
    if (this.events.length > 80) this.events.length = 80;
  }

  active(at: number): WorldEvent[] {
    return this.events.filter(e => e.startedAt <= at && (e.endsAt === undefined || e.endsAt > at));
  }

  relevantTo(npc: LivingNpc, at: number, radius = 80): WorldEvent[] {
    return this.active(at).filter(e => {
      if (!e.location) return e.importance >= 50;
      const dx = e.location.x - npc.currentLocation.worldX;
      const dy = e.location.y - npc.currentLocation.worldY;
      const r = e.location.radius ?? radius;
      return Math.hypot(dx, dy) <= r || e.participants?.includes(npc.id);
    });
  }

  /** Lightweight daily rolls — deterministic-ish from day number. */
  maybeSpawnDaily(day: number, at: number, origin: { x: number; y: number }) {
    const roll = ((day * 1103515245 + 12345) >>> 0) % 100;
    if (roll < 12) {
      this.push(
        createWorldEvent({
          kind: 'market_day',
          title: 'Market Day',
          description: 'Stalls fill the plaza; merchants expect more customers.',
          importance: 60,
          location: { x: origin.x, y: origin.y, radius: 40 },
          startedAt: at,
          endsAt: at + 60 * 12
        })
      );
    } else if (roll < 18) {
      this.push(
        createWorldEvent({
          kind: 'festival',
          title: 'Pixel Festival',
          description: 'Music and lanterns — townsfolk gather in the evening.',
          importance: 75,
          location: { x: origin.x, y: origin.y, radius: 50 },
          startedAt: at,
          endsAt: at + 60 * 10
        })
      );
    } else if (roll < 22) {
      this.push(
        createWorldEvent({
          kind: 'economic',
          title: 'Coin Shortage',
          description: 'Travelers say coin is tight; prices may rise.',
          importance: 55,
          startedAt: at,
          endsAt: at + 60 * 24
        })
      );
    }
  }

  emit(
    kind: WorldEventKind,
    title: string,
    description: string,
    at: number,
    extra?: Partial<WorldEvent>
  ) {
    this.push(
      createWorldEvent({
        kind,
        title,
        description,
        importance: extra?.importance ?? 50,
        startedAt: at,
        ...extra
      })
    );
  }
}

export function eventReactionHint(npc: LivingNpc, event: WorldEvent): string | null {
  if (event.kind === 'market_day' && (npc.occupation === 'merchant' || npc.occupation === 'baker')) {
    return 'Open early and travel to market with extra stock.';
  }
  if (event.kind === 'storm') {
    return npc.personality.fearfulness > 0.6 ? 'Seek shelter indoors.' : 'Continue cautiously.';
  }
  if (event.kind === 'festival' && npc.personality.sociality > 0.55) {
    return 'Join the festival after work.';
  }
  if (event.kind === 'crime' && npc.occupation === 'guard') {
    return 'Investigate the area.';
  }
  return null;
}

export function formatEventsForPrompt(events: WorldEvent[]): string {
  if (!events.length) return '(no local world events)';
  return events.map(e => `- ${e.title}: ${e.description}`).join('\n');
}
