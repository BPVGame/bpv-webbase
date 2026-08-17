import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { bpvApi } from '../../api/BpvApiClient';

interface Props {
  open: boolean;
  onCreated: (name: string, address: string, port: number, password?: string) => void;
  onBack: () => void;
}

export const CreateServerForm: React.FC<Props> = ({ open, onCreated, onBack }) => {
  const [name, setName] = useState('My BPV World');
  const [description, setDescription] = useState('Community infinite shard');
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [port, setPort] = useState(3001);
  const [pvp, setPvp] = useState(false);
  const [pve, setPve] = useState(true);
  const [npcAi, setNpcAi] = useState(true);
  const [password, setPassword] = useState('');
  const [seed, setSeed] = useState('havenbrook');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  return (
    <GamePopup
      open={open}
      kicker="Host"
      title="Create Server"
      onClose={onBack}
      footer={
        <>
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="pause-resume"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
              await bpvApi.registerGameServer({
                name,
                description,
                address: host,
                port,
                maxPlayers,
                pvp,
                pve,
                npcAi,
                passwordProtected: Boolean(password),
                kind: 'self_hosted'
              });
              setNote('Listed in the directory. Run npm run game-server with server.config.json for a dedicated host.');
              setBusy(false);
              onCreated(name, host, port, password || undefined);
            }}
          >
            Create Server
          </button>
        </>
      }
    >
      <label className="gate-label">
        Server Name
        <input className="gate-input" value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="gate-label">
        Description
        <input className="gate-input" value={description} onChange={e => setDescription(e.target.value)} />
      </label>
      <div className="gate-grid">
        <label className="gate-label">
          Max players
          <input
            className="gate-input"
            type="number"
            value={maxPlayers}
            onChange={e => setMaxPlayers(Number(e.target.value))}
          />
        </label>
        <label className="gate-label">
          Port
          <input className="gate-input" type="number" value={port} onChange={e => setPort(Number(e.target.value))} />
        </label>
      </div>
      <label className="gate-label">
        World Seed
        <input className="gate-input" value={seed} onChange={e => setSeed(e.target.value)} />
      </label>
      <label className="gate-check">
        <input type="checkbox" checked={pve} onChange={e => setPve(e.target.checked)} /> PvE
      </label>
      <label className="gate-check">
        <input type="checkbox" checked={pvp} onChange={e => setPvp(e.target.checked)} /> PvP
      </label>
      <label className="gate-check">
        <input type="checkbox" checked={npcAi} onChange={e => setNpcAi(e.target.checked)} /> NPC AI
      </label>
      <label className="gate-label">
        Password
        <input className="gate-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {note ? <p className="gate-empty">{note}</p> : null}
    </GamePopup>
  );
};
