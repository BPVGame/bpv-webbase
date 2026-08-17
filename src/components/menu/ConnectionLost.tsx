import React from 'react';
import { GamePopup } from '../ui/GamePopup';
import { ConnectFailure } from '../../game/gate/types';

interface Props {
  open: boolean;
  failure: ConnectFailure | null;
  onRetry: () => void;
  onServers: () => void;
  onOffline: () => void;
  onMenu: () => void;
}

export const ConnectionLost: React.FC<Props> = ({ open, failure, onRetry, onServers, onOffline, onMenu }) => (
  <GamePopup
    open={open}
    kicker="Connection"
    title={failure?.reason === 'Connection lost' ? 'CONNECTION LOST' : 'Unable to connect'}
    footer={
      <>
        <button type="button" onClick={onRetry}>
          {failure?.reason === 'Connection lost' ? 'Reconnect' : 'Retry'}
        </button>
        <button type="button" onClick={onServers}>
          Server List
        </button>
        <button type="button" onClick={onOffline}>
          Offline Mode
        </button>
        <button type="button" onClick={onMenu}>
          Main Menu
        </button>
      </>
    }
  >
    <p>
      <strong>Server:</strong> {failure?.serverName ?? '—'}
    </p>
    <p>
      <strong>Reason:</strong> {failure?.reason ?? 'Connection timeout'}
    </p>
    <p className="gate-empty">The game did not crash. You can retry, play offline, or return to the menu.</p>
  </GamePopup>
);
