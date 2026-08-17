import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { parseDirectAddress } from '../../game/gate/types';

interface Props {
  open: boolean;
  onConnect: (address: string, port: number, password?: string) => void;
  onBack: () => void;
}

export const DirectConnectForm: React.FC<Props> = ({ open, onConnect, onBack }) => {
  const [raw, setRaw] = useState('127.0.0.1:3001');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <GamePopup
      open={open}
      kicker="Direct"
      title="Direct Connect"
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
              const parsed = parseDirectAddress(raw);
              if (!parsed) {
                setError('Enter host:port (example play.mygame.com:7777)');
                return;
              }
              setError('');
              onConnect(parsed.address, parsed.port, password || undefined);
            }}
          >
            Connect
          </button>
        </>
      }
    >
      <label className="gate-label">
        Address
        <input className="gate-input" value={raw} onChange={e => setRaw(e.target.value)} placeholder="play.mygame.com:7777" />
      </label>
      <label className="gate-label">
        Password
        <input className="gate-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {error ? <p className="gate-error">{error}</p> : null}
    </GamePopup>
  );
};
