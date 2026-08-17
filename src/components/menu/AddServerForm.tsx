import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { NetworkProtocol, SavedServer } from '../../game/gate/types';

interface Props {
  open: boolean;
  onSave: (server: SavedServer) => void;
  onBack: () => void;
}

export const AddServerForm: React.FC<Props> = ({ open, onSave, onBack }) => {
  const [name, setName] = useState('My BPV Server');
  const [address, setAddress] = useState('127.0.0.1');
  const [port, setPort] = useState('3001');
  const [protocol, setProtocol] = useState<NetworkProtocol>('http');
  const [password, setPassword] = useState('');

  return (
    <GamePopup
      open={open}
      kicker="Custom server"
      title="Add Server"
      onClose={onBack}
      footer={
        <>
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="pause-resume"
            onClick={() => {
              const p = Number(port);
              if (!name.trim() || !address.trim() || !Number.isInteger(p) || p < 1) return;
              onSave({
                id: `saved_${address}_${p}`,
                name: name.trim().slice(0, 48),
                address: address.trim().slice(0, 120),
                port: p,
                protocol,
                password: password || undefined,
                kind: 'private'
              });
            }}
          >
            Save
          </button>
        </>
      }
    >
      <label className="gate-label">
        Server Name
        <input className="gate-input" value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="gate-label">
        Address
        <input className="gate-input" value={address} onChange={e => setAddress(e.target.value)} />
      </label>
      <label className="gate-label">
        Port
        <input className="gate-input" value={port} onChange={e => setPort(e.target.value)} />
      </label>
      <label className="gate-label">
        Protocol
        <select className="gate-input" value={protocol} onChange={e => setProtocol(e.target.value as NetworkProtocol)}>
          <option value="http">http</option>
          <option value="https">https</option>
          <option value="ws">ws</option>
        </select>
      </label>
      <label className="gate-label">
        Password (optional)
        <input className="gate-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
    </GamePopup>
  );
};
