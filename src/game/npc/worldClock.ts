import { LivingNpc, NpcNeeds, ScheduleBlock, WorldTimeState, WeatherKind, Season } from './types';
import { clamp100, moodFromEmotions } from './personality';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class WorldClock {
  state: WorldTimeState;

  constructor(opts?: Partial<WorldTimeState>) {
    this.state = {
      day: 1,
      dateLabel: 'Day 1',
      minuteOfDay: 8 * 60,
      hour: 8,
      minute: 0,
      season: 'spring',
      weather: 'clear',
      syncedAtMs: Date.now(),
      timeScale: 1, // 1 game minute per real second (tunable)
      ...opts
    };
    this.syncDerived();
  }

  /** Advance by real delta seconds. */
  tick(deltaSec: number) {
    const add = deltaSec * this.state.timeScale;
    this.state.minuteOfDay += add;
    while (this.state.minuteOfDay >= 24 * 60) {
      this.state.minuteOfDay -= 24 * 60;
      this.state.day += 1;
      if (this.state.day % 30 === 1) {
        const idx = SEASONS.indexOf(this.state.season);
        this.state.season = SEASONS[(idx + 1) % SEASONS.length];
      }
      this.rollDailyWeather();
    }
    this.syncDerived();
  }

  private syncDerived() {
    this.state.hour = Math.floor(this.state.minuteOfDay / 60) % 24;
    this.state.minute = Math.floor(this.state.minuteOfDay % 60);
    this.state.dateLabel = `Day ${this.state.day}`;
    this.state.syncedAtMs = Date.now();
  }

  private rollDailyWeather() {
    const r = Math.random();
    if (r < 0.55) this.state.weather = 'clear';
    else if (r < 0.75) this.state.weather = 'cloudy';
    else if (r < 0.9) this.state.weather = 'rain';
    else if (r < 0.97) this.state.weather = 'fog';
    else this.state.weather = 'storm';
  }

  setWeather(w: WeatherKind) {
    this.state.weather = w;
  }

  getWorldTime() {
    return {
      day: this.state.day,
      date: this.state.dateLabel,
      time: `${String(this.state.hour).padStart(2, '0')}:${String(this.state.minute).padStart(2, '0')}`,
      season: this.state.season,
      weather: this.state.weather,
      minuteOfDay: this.state.minuteOfDay
    };
  }

  snapshot(): WorldTimeState {
    return { ...this.state };
  }
}

export function scheduleForOccupation(occupation: LivingNpc['occupation']): ScheduleBlock[] {
  const workStart = occupation === 'baker' ? 5 * 60 : occupation === 'guard' ? 6 * 60 : 8 * 60;
  const workEnd = occupation === 'innkeeper' ? 22 * 60 : 17 * 60;
  return [
    { startMinute: 6 * 60 + 30, endMinute: 7 * 60, activity: 'wake_up', locationKey: 'home', flexible: true },
    { startMinute: 7 * 60, endMinute: 7 * 60 + 45, activity: 'breakfast', locationKey: 'home', flexible: true },
    { startMinute: workStart, endMinute: workStart + 30, activity: 'travel_to_work', locationKey: 'workplace', flexible: true },
    { startMinute: workStart + 30, endMinute: 12 * 60, activity: 'work', locationKey: 'workplace' },
    { startMinute: 12 * 60, endMinute: 13 * 60, activity: 'lunch', locationKey: 'market', flexible: true },
    { startMinute: 13 * 60, endMinute: workEnd, activity: 'work', locationKey: 'workplace' },
    { startMinute: workEnd, endMinute: workEnd + 30, activity: 'leave_work', locationKey: 'workplace', flexible: true },
    { startMinute: workEnd + 30, endMinute: 19 * 60, activity: 'visit_market', locationKey: 'market', flexible: true },
    { startMinute: 19 * 60, endMinute: 20 * 60, activity: 'return_home', locationKey: 'home', flexible: true },
    { startMinute: 20 * 60, endMinute: 22 * 60 + 30, activity: 'socialize', locationKey: 'plaza', flexible: true },
    { startMinute: 22 * 60 + 30, endMinute: 24 * 60, activity: 'sleep', locationKey: 'home' },
    { startMinute: 0, endMinute: 6 * 60 + 30, activity: 'sleep', locationKey: 'home' }
  ];
}

export function currentScheduleBlock(npc: LivingNpc, minuteOfDay: number): ScheduleBlock | null {
  const m = ((minuteOfDay % (24 * 60)) + 24 * 60) % (24 * 60);
  return npc.schedule.find(b => m >= b.startMinute && m < b.endMinute) ?? null;
}

/** Periodic needs update — not every frame. */
export function updateNeeds(npc: LivingNpc, elapsedMinutes: number, activity: string): void {
  const rate = Math.max(0.2, elapsedMinutes);
  const n = npc.needs;
  n.hunger = clamp100(n.hunger + rate * 0.35);
  n.energy = clamp100(n.energy - rate * (activity === 'sleep' ? -0.8 : activity === 'work' ? 0.45 : 0.2));
  n.social = clamp100(n.social + rate * (activity === 'socialize' ? -0.6 : 0.25));
  n.entertainment = clamp100(n.entertainment + rate * 0.15);
  if (activity === 'work') n.work = clamp100(n.work - rate * 0.4);
  else n.work = clamp100(n.work + rate * 0.1);
  n.money = clamp100(100 - Math.min(100, npc.money / 5));
  npc.currentMood = moodFromEmotions(npc.emotions);
}

export function mostUrgentNeed(needs: NpcNeeds): keyof NpcNeeds | null {
  const entries = Object.entries(needs) as Array<[keyof NpcNeeds, number]>;
  // Higher = more urgent for hunger/social/etc; money need is inverse of wealth already
  entries.sort((a, b) => b[1] - a[1]);
  const [key, val] = entries[0];
  if (val < 55) return null;
  return key;
}

export function posFromWorld(x: number, y: number, chunkSize = 16) {
  return {
    worldX: x,
    worldY: y,
    chunkX: Math.floor(x / chunkSize),
    chunkY: Math.floor(y / chunkSize)
  };
}
