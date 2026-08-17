import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { bpvApi } from '../../api/BpvApiClient';
import { retroAudio } from '../../game/AudioSynth';

interface Props {
  open: boolean;
  defaultName: string;
  onSkip: () => void;
  onAuthed: (token: string | null, username: string) => void;
  onBack: () => void;
}

export const LoginPanel: React.FC<Props> = ({ open, defaultName, onSkip, onAuthed, onBack }) => {
  const [username, setUsername] = useState(defaultName);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (register: boolean) => {
    setBusy(true);
    setError('');
    try {
      const r = register
        ? await bpvApi.register(username, `${username}@bpv.local`, password || 'bpv')
        : await bpvApi.login(username, password || 'bpv');
      retroAudio.playItemPickup();
      onAuthed(r.token, r.user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed — you can still join as a guest.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePopup
      open={open}
      kicker="Online"
      title="Login / Profile"
      onClose={onBack}
      footer={
        <>
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button type="button" onClick={() => onSkip()}>
            Continue as guest
          </button>
          <button type="button" disabled={busy} onClick={() => void submit(true)}>
            Register
          </button>
          <button type="button" className="pause-resume" disabled={busy} onClick={() => void submit(false)}>
            Login
          </button>
        </>
      }
    >
      <label className="gate-label">
        Username
        <input className="gate-input" value={username} onChange={e => setUsername(e.target.value.slice(0, 24))} />
      </label>
      <label className="gate-label">
        Password
        <input className="gate-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {error ? <p className="gate-error">{error}</p> : null}
      <p className="gate-empty">Guest joins the dedicated server without mixing local save data.</p>
    </GamePopup>
  );
};
