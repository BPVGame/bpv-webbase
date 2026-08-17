import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { GameSettings, PlayMode } from '../../game/gate/types';
import { retroAudio } from '../../game/AudioSynth';

type Tab = 'game' | 'graphics' | 'audio' | 'controls' | 'network' | 'account' | 'server';

interface Props {
  open: boolean;
  settings: GameSettings;
  mode: PlayMode | null;
  connected: boolean;
  pingMs: number | null;
  serverName: string | null;
  role: string;
  onChange: (partial: Partial<GameSettings>) => void;
  onRequestMode: (mode: PlayMode) => void;
  onLeaveServer: () => void;
  onClose: () => void;
}

export const SettingsPopup: React.FC<Props> = ({
  open,
  settings,
  mode,
  connected,
  pingMs,
  serverName,
  role,
  onChange,
  onRequestMode,
  onLeaveServer,
  onClose
}) => {
  const [tab, setTab] = useState<Tab>('game');
  const [leaveAsk, setLeaveAsk] = useState(false);

  const tabs: Tab[] = ['game', 'graphics', 'audio', 'controls', 'network', 'account', 'server'];

  return (
    <GamePopup open={open} wide kicker="System" title="Settings" onClose={onClose}>
      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'game' && (
        <div className="settings-block">
          <label className="gate-check">
            <input
              type="checkbox"
              checked={settings.showHints}
              onChange={e => onChange({ showHints: e.target.checked })}
            />
            Show control hints
          </label>
          <p>Game mode</p>
          <div className="settings-row">
            <button
              type="button"
              onClick={() => {
                if (mode === 'online') setLeaveAsk(true);
                else onRequestMode('offline');
              }}
            >
              Offline
            </button>
            <button type="button" onClick={() => onRequestMode('online')}>
              Online
            </button>
          </div>
          {leaveAsk ? (
            <div className="leave-confirm">
              <p>You must leave the current server before switching modes.</p>
              <button type="button" onClick={() => { onLeaveServer(); setLeaveAsk(false); }}>
                Leave Server
              </button>
              <button type="button" onClick={() => setLeaveAsk(false)}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'graphics' && (
        <div className="settings-block">
          <label className="gate-label">
            Pixel scale
            <select
              className="gate-input"
              value={settings.pixelScale}
              onChange={e => onChange({ pixelScale: e.target.value as GameSettings['pixelScale'] })}
            >
              <option value="crisp">Crisp</option>
              <option value="native">Native</option>
            </select>
          </label>
        </div>
      )}

      {tab === 'audio' && (
        <div className="settings-block">
          <label className="gate-check">
            <input
              type="checkbox"
              checked={settings.mute}
              onChange={e => {
                const mute = e.target.checked;
                retroAudio.setMuted(mute);
                onChange({ mute });
              }}
            />
            Mute
          </label>
          <label className="gate-label">
            Music {Math.round(settings.musicVolume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={e => onChange({ musicVolume: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {tab === 'controls' && (
        <p className="gate-empty">WASD move · E talk · I bag · Esc pause · F3 NPC debug</p>
      )}

      {tab === 'network' && (
        <div className="settings-block">
          <p>
            <strong>{connected ? 'CONNECTED' : 'OFFLINE'}</strong>
          </p>
          <p>Server: {serverName || '—'}</p>
          <p>Ping: {pingMs == null ? '—' : `${pingMs}ms`}</p>
          <p>Region: {settings.region}</p>
          <p>Protocol: {settings.protocol}</p>
          <label className="gate-check">
            <input
              type="checkbox"
              checked={settings.autoReconnect}
              onChange={e => onChange({ autoReconnect: e.target.checked })}
            />
            Auto reconnect
          </label>
          <p className="gate-empty">Download updates: client 1.0.0 is current.</p>
        </div>
      )}

      {tab === 'account' && (
        <p className="gate-empty">
          Online characters live on the server. Offline profile stays in local save. Role: {role}.
        </p>
      )}

      {tab === 'server' && (
        <p className="gate-empty">
          Host with <code>npm run game-server</code> and <code>server.config.json</code>. Owner tools appear in pause
          if your session role is moderator+.
        </p>
      )}
    </GamePopup>
  );
};
