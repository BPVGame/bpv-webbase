import React from 'react';
import { ConnectProgress } from '../../game/gate/types';

const ORDER = ['connecting', 'authenticating', 'loading_character', 'loading_world', 'synchronizing'] as const;

export const ConnectingOverlay: React.FC<{ progress: ConnectProgress | null; serverName?: string }> = ({
  progress,
  serverName
}) => {
  if (!progress) return null;
  const idx = ORDER.indexOf(progress.step);
  return (
    <div className="connect-overlay">
      <div className="connect-card">
        <p className="pause-kicker">{serverName || 'Game Server'}</p>
        <h2>Entering world</h2>
        <ul>
          {ORDER.map((step, i) => (
            <li key={step} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}>
              {progress.step === step ? progress.label : step.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
        <p className="connect-note">World stays infinite. Waiting for server snapshot…</p>
      </div>
    </div>
  );
};
