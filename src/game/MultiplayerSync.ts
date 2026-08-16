/**
 * Multiplayer sync foundation — presence heartbeats + remote avatars on IsoEarth.
 * Production path: WebSocket upgrade on bpvgame.com; this client degrades to REST polling.
 */

import { bpvApi } from '../api/BpvApiClient';
import type { RemotePlayer } from './iso/IsoEarth';

export interface PresenceState {
  connected: boolean;
  nearby: RemotePlayer[];
  lastSyncAt: number | null;
}

export class MultiplayerSync {
  private timer: ReturnType<typeof setInterval> | null = null;
  private district = 'city_center';
  private col = 0;
  private row = 0;
  private username = 'Trainer';
  private lat?: number;
  private lng?: number;
  public state: PresenceState = { connected: false, nearby: [], lastSyncAt: null };
  private onUpdate?: (state: PresenceState) => void;

  public start(
    username: string,
    opts?: { intervalMs?: number; onUpdate?: (state: PresenceState) => void }
  ) {
    this.username = username;
    this.onUpdate = opts?.onUpdate;
    this.stop();
    this.timer = setInterval(() => this.tick(), opts?.intervalMs ?? 2500);
    void this.tick();
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  public updatePose(district: string, col: number, row: number, lat?: number, lng?: number) {
    this.district = district;
    this.col = col;
    this.row = row;
    this.lat = lat;
    this.lng = lng;
  }

  private async tick() {
    try {
      const res = await bpvApi.heartbeat({
        username: this.username,
        district: this.district,
        col: this.col,
        row: this.row,
        lat: this.lat,
        lng: this.lng
      });

      const nearby: RemotePlayer[] = (res.nearby || []).map(n => ({
        id: String(n.id),
        username: n.username,
        col: n.col,
        row: n.row,
        skin: '#fed7aa',
        shirt: '#dc2626'
      }));

      // Local demo peers when API unavailable
      if (!res.ok && nearby.length === 0) {
        nearby.push(
          {
            id: 'demo-2',
            username: 'PixelMaster_99',
            col: this.col + 2,
            row: this.row - 1,
            skin: '#fed7aa',
            shirt: '#dc2626'
          },
          {
            id: 'demo-3',
            username: 'AquaRider',
            col: this.col - 1,
            row: this.row + 2,
            skin: '#fbcfe8',
            shirt: '#10b981'
          }
        );
      }

      this.state = {
        connected: !!res.ok,
        nearby,
        lastSyncAt: Date.now()
      };
      this.onUpdate?.(this.state);
    } catch {
      this.state = { ...this.state, connected: false };
      this.onUpdate?.(this.state);
    }
  }
}

export const multiplayerSync = new MultiplayerSync();
