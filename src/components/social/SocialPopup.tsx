import React, { useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { onlineGate } from '../../net/OnlineGate';

interface Props {
  kind: 'friends' | 'party' | 'guild' | null;
  onClose: () => void;
}

export const SocialPopup: React.FC<Props> = ({ kind, onClose }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  if (!kind) return null;
  const title = kind === 'friends' ? 'Friends' : kind === 'party' ? 'Party' : 'Guild';
  const action = kind === 'friends' ? 'friend_request' : kind === 'party' ? 'party_invite' : 'guild_invite';

  return (
    <GamePopup open kicker="Social" title={title} onClose={onClose}>
      <p className="gate-empty">
        Architecture is live: invites are validated on the dedicated server. Full friends/party/guild UIs can grow on
        this handshake.
      </p>
      <label className="gate-label">
        Player / guild
        <input className="gate-input" value={name} onChange={e => setName(e.target.value)} />
      </label>
      <button
        type="button"
        className="pause-resume"
        onClick={async () => {
          if (!onlineGate.sessionId) {
            setNote('Go online to send invites.');
            return;
          }
          const r: any = await onlineGate.action(action, { username: name, guild: name });
          setNote(r.ok ? 'Sent.' : r.error || 'Failed');
        }}
      >
        Send
      </button>
      {note ? <p>{note}</p> : null}
    </GamePopup>
  );
};
