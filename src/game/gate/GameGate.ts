/**
 * Game Gate state machine — boot → menu → offline local world OR online server.
 */

import {
  ConnectFailure,
  ConnectProgress,
  GatePhase,
  GameServerInfo,
  GameSettings,
  OfflineProfile,
  OnlineCharacter,
  PlayMode,
  SavedServer,
  DEFAULT_SETTINGS
} from './types';
import { defaultOfflineProfile, hasOfflineSave, loadOfflineProfile, saveOfflineProfile } from './localProfile';
import { loadSettings, saveSettings } from './settingsStore';
import { loadSavedServers, upsertSavedServer } from './savedServers';

export interface GateSnapshot {
  phase: GatePhase;
  mode: PlayMode | null;
  settings: GameSettings;
  offlineProfile: OfflineProfile | null;
  hasLocalSave: boolean;
  savedServers: SavedServer[];
  directory: GameServerInfo[];
  selectedServer: GameServerInfo | null;
  character: OnlineCharacter | null;
  progress: ConnectProgress | null;
  failure: ConnectFailure | null;
  sessionToken: string | null;
  role: OnlineCharacter['role'] | 'player';
  pingMs: number | null;
  connectedServerName: string | null;
}

type Listener = () => void;

const CONNECT_STEPS: ConnectProgress[] = [
  { step: 'connecting', label: 'Connecting...' },
  { step: 'authenticating', label: 'Authenticating...' },
  { step: 'loading_character', label: 'Loading character...' },
  { step: 'loading_world', label: 'Loading world...' },
  { step: 'synchronizing', label: 'Synchronizing...' }
];

export class GameGate {
  phase: GatePhase = 'boot';
  mode: PlayMode | null = null;
  settings: GameSettings = loadSettings();
  offlineProfile: OfflineProfile | null = loadOfflineProfile();
  savedServers: SavedServer[] = loadSavedServers();
  directory: GameServerInfo[] = [];
  selectedServer: GameServerInfo | null = null;
  character: OnlineCharacter | null = null;
  progress: ConnectProgress | null = null;
  failure: ConnectFailure | null = null;
  sessionToken: string | null = null;
  pingMs: number | null = null;
  connectedServerName: string | null = null;
  private listeners = new Set<Listener>();
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  snapshot(): GateSnapshot {
    return {
      phase: this.phase,
      mode: this.mode,
      settings: this.settings,
      offlineProfile: this.offlineProfile,
      hasLocalSave: hasOfflineSave(),
      savedServers: this.savedServers,
      directory: this.directory,
      selectedServer: this.selectedServer,
      character: this.character,
      progress: this.progress,
      failure: this.failure,
      sessionToken: this.sessionToken,
      role: this.character?.role ?? 'player',
      pingMs: this.pingMs,
      connectedServerName: this.connectedServerName
    };
  }

  boot() {
    this.phase = 'main_menu';
    this.mode = null;
    this.failure = null;
    this.progress = null;
    this.emit();
  }

  openGate() {
    if (this.phase === 'playing' && this.mode === 'online') return;
    this.phase = 'gate';
    this.emit();
  }

  backToMenu() {
    this.clearConnectTimer();
    if (this.phase === 'playing' && this.mode === 'online') {
      this.leaveServer();
      return;
    }
    this.phase = 'main_menu';
    this.mode = null;
    this.progress = null;
    this.failure = null;
    this.connectedServerName = null;
    this.sessionToken = null;
    this.character = null;
    this.emit();
  }

  exitGame() {
    this.clearConnectTimer();
    this.phase = 'exited';
    this.mode = null;
    this.emit();
  }

  chooseOffline() {
    this.mode = 'offline';
    this.phase = 'offline_load';
    this.sessionToken = null;
    this.character = null;
    this.connectedServerName = null;
    if (!this.offlineProfile) this.offlineProfile = defaultOfflineProfile();
    this.emit();
  }

  confirmOfflineWorld() {
    if (this.mode !== 'offline') return;
    if (!this.offlineProfile) this.offlineProfile = defaultOfflineProfile();
    saveOfflineProfile(this.offlineProfile);
    this.phase = 'playing';
    this.emit();
  }

  persistOffline(partial: Partial<OfflineProfile>) {
    if (this.mode !== 'offline') return;
    this.offlineProfile = { ...(this.offlineProfile ?? defaultOfflineProfile()), ...partial, savedAt: Date.now() };
    saveOfflineProfile(this.offlineProfile);
    this.emit();
  }

  chooseOnline() {
    this.mode = 'online';
    this.phase = 'auth';
    this.emit();
  }

  openMultiplayer() {
    this.mode = 'online';
    this.phase = 'multiplayer_menu';
    this.emit();
  }

  openServerSelect() {
    this.mode = 'online';
    this.phase = 'server_select';
    this.emit();
  }

  openAddServer() {
    this.phase = 'add_server';
    this.emit();
  }

  openDirectConnect() {
    this.phase = 'direct_connect';
    this.emit();
  }

  openCreateServer() {
    this.phase = 'create_server';
    this.emit();
  }

  setDirectory(list: GameServerInfo[]) {
    this.directory = list;
    this.emit();
  }

  addSavedServer(server: SavedServer) {
    this.savedServers = upsertSavedServer(this.savedServers, server);
    this.emit();
  }

  selectServer(server: GameServerInfo) {
    this.selectedServer = server;
    this.emit();
  }

  authenticated(token: string, character: OnlineCharacter) {
    this.sessionToken = token;
    this.character = character;
    if (this.phase === 'auth') this.phase = 'server_select';
    this.emit();
  }

  beginConnect(server: GameServerInfo) {
    this.selectedServer = server;
    this.failure = null;
    this.phase = 'connect';
    this.progress = CONNECT_STEPS[0];
    this.emit();
  }

  advanceConnect(index: number) {
    const step = CONNECT_STEPS[index];
    if (!step) return;
    this.progress = step;
    if (step.step === 'loading_character') this.phase = 'load_player';
    if (step.step === 'loading_world') this.phase = 'load_world';
    if (step.step === 'synchronizing') this.phase = 'sync';
    this.emit();
  }

  finishConnect(character: OnlineCharacter, pingMs: number) {
    this.character = character;
    this.pingMs = pingMs;
    this.connectedServerName = this.selectedServer?.name ?? 'BPV Server';
    this.mode = 'online';
    this.phase = 'playing';
    this.progress = null;
    this.failure = null;
    this.emit();
  }

  failConnect(reason: string) {
    this.clearConnectTimer();
    this.phase = 'connection_lost';
    this.failure = {
      serverName: this.selectedServer?.name ?? 'Unknown server',
      reason
    };
    this.progress = null;
    this.emit();
  }

  leaveServer() {
    this.clearConnectTimer();
    this.mode = null;
    this.sessionToken = null;
    this.character = null;
    this.connectedServerName = null;
    this.pingMs = null;
    this.phase = 'main_menu';
    this.emit();
  }

  patchCharacter(partial: Partial<OnlineCharacter>) {
    if (!this.character || this.mode !== 'online') return;
    this.character = { ...this.character, ...partial };
    this.emit();
  }

  /** Online worlds must disconnect before an offline session starts. */
  requestModeSwitch(next: PlayMode): { ok: true } | { ok: false; needLeaveServer: true } {
    if (this.phase === 'playing' && this.mode === next) return { ok: true };
    if (this.phase === 'playing' && this.mode === 'online' && next === 'offline') {
      return { ok: false, needLeaveServer: true };
    }
    if (next === 'offline') {
      this.chooseOffline();
      return { ok: true };
    }
    this.chooseOnline();
    return { ok: true };
  }

  applySettings(partial: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...partial };
    saveSettings(this.settings);
    this.emit();
  }

  resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    saveSettings(this.settings);
    this.emit();
  }

  private clearConnectTimer() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
  }
}

export const gameGate = new GameGate();
