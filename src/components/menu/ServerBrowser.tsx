import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { GameServerInfo } from '../../game/gate/types';
import { retroAudio } from '../../game/AudioSynth';

interface Props {
  open: boolean;
  servers: GameServerInfo[];
  selectedId?: string | null;
  onRefresh: () => void;
  onSelect: (s: GameServerInfo) => void;
  onJoin: () => void;
  onAdd: () => void;
  onDirect: () => void;
  onCreate: () => void;
  onBack: () => void;
}

export const ServerBrowser: React.FC<Props> = ({
  open,
  servers,
  selectedId,
  onRefresh,
  onSelect,
  onJoin,
  onAdd,
  onDirect,
  onCreate,
  onBack
}) => {
  const [filter, setFilter] = useState('');
  const rows = servers.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <GamePopup
      open={open}
      wide
      kicker="Online Multiplayer Gate"
      title="Servers"
      onClose={onBack}
      footer={
        <>
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button type="button" onClick={() => { retroAudio.playClick(); onRefresh(); }}>
            Refresh
          </button>
          <button type="button" onClick={onAdd}>
            Add Server
          </button>
          <button type="button" onClick={onDirect}>
            Direct Connect
          </button>
          <button type="button" onClick={onCreate}>
            Create Server
          </button>
          <button type="button" className="pause-resume" onClick={onJoin} disabled={!selectedId}>
            Join
          </button>
        </>
      }
    >
      <input
        className="gate-input"
        placeholder="Filter servers…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div className="server-table">
        <div className="server-row is-head">
          <span>Server</span>
          <span>Players</span>
          <span>Ping</span>
          <span>Status</span>
        </div>
        {rows.map(s => (
          <button
            key={s.id}
            type="button"
            className={`server-row ${selectedId === s.id ? 'is-active' : ''}`}
            onClick={() => {
              retroAudio.playClick();
              onSelect(s);
            }}
          >
            <span>
              <strong>{s.name}</strong>
              <small>
                {s.kind} · {s.region || '—'} {s.passwordProtected ? '· 🔒' : ''} {s.npcAi ? '· NPC AI' : ''}
              </small>
            </span>
            <span>
              {s.players}/{s.maxPlayers}
            </span>
            <span>{s.pingMs == null ? '—' : `${s.pingMs}ms`}</span>
            <span className={`server-status is-${s.status}`}>{s.status}</span>
          </button>
        ))}
        {rows.length === 0 ? <p className="gate-empty">No servers yet. Add one or host locally.</p> : null}
      </div>
    </GamePopup>
  );
};
