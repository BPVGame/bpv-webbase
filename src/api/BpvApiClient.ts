/**
 * BPV Game API client — targets https://bpvgame.com (or local server).
 * Shared contract mirrored by ios/BPVGame/Sources/BpvApiClient.swift
 */

const DEFAULT_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BPV_API_URL) ||
  'https://bpvgame.com';

export interface BpvUser {
  id: number;
  username: string;
  email?: string;
  level: number;
  xp: number;
  coins: number;
  avatar_skin: string;
  avatar_hair: string;
  avatar_shirt: string;
  avatar_pants: string;
}

export interface BpvFishCard {
  id: number;
  card_slug: string;
  name: string;
  rarity: string;
  level: number;
  attack: number;
  defense: number;
  speed: number;
  description: string;
  emoji?: string;
}

export interface BpvTournament {
  id: number;
  name: string;
  description: string;
  max_players: number;
  current_players: number;
  status: string;
  prize_description: string;
  start_time: string;
}

export interface BpvMission {
  id: number;
  mission_key: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  is_completed: boolean;
  reward_xp: number;
  reward_coins: number;
}

export interface AuthResponse {
  token: string;
  user: BpvUser;
}

export class BpvApiClient {
  public baseUrl: string;
  public token: string | null = null;

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('bpv_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('bpv_token', token);
      else localStorage.removeItem('bpv_token');
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>)
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // Auth
  register(username: string, email: string, password: string) {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    }).then(r => {
      this.setToken(r.token);
      return r;
    });
  }

  login(username: string, password: string) {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }).then(r => {
      this.setToken(r.token);
      return r;
    });
  }

  // Player
  getPlayer() {
    return this.request<BpvUser>('/api/player');
  }

  updateAvatar(avatar: Partial<BpvUser>) {
    return this.request<BpvUser>('/api/player/avatar', {
      method: 'PUT',
      body: JSON.stringify(avatar)
    });
  }

  // Cards
  getCards() {
    return this.request<BpvFishCard[]>('/api/player/cards');
  }

  upgradeCard(cardId: number) {
    return this.request<BpvFishCard>(`/api/cards/${cardId}/upgrade`, { method: 'POST' });
  }

  // Tournaments
  getTournaments() {
    return this.request<BpvTournament[]>('/api/tournaments');
  }

  createTournament(payload: {
    name: string;
    description: string;
    max_players: number;
    prize_description: string;
  }) {
    return this.request<BpvTournament>('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  joinTournament(id: number) {
    return this.request<BpvTournament>(`/api/tournaments/${id}/join`, { method: 'POST' });
  }

  // Missions
  getMissions() {
    return this.request<BpvMission[]>('/api/missions');
  }

  claimMission(id: number) {
    return this.request<BpvMission>(`/api/missions/${id}/claim`, { method: 'POST' });
  }

  // Multiplayer presence (foundation)
  heartbeat(payload: {
    username: string;
    district: string;
    col: number;
    row: number;
    lat?: number;
    lng?: number;
  }) {
    return this.request<{ ok: boolean; nearby: Array<{ id: string; username: string; col: number; row: number }> }>(
      '/api/multiplayer/heartbeat',
      { method: 'POST', body: JSON.stringify(payload) }
    ).catch(() => ({ ok: false, nearby: [] as Array<{ id: string; username: string; col: number; row: number }> }));
  }
}

export const bpvApi = new BpvApiClient();
