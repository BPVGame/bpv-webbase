import React from 'react';
import { GamePopup } from '../ui/GamePopup';
import { hasOfflineSave } from '../../game/gate/localProfile';

interface Props {
  open: boolean;
  onOffline: () => void;
  onOnline: () => void;
  onSandbox: () => void;
  onServers: () => void;
  onBack: () => void;
}

export const GateChooser: React.FC<Props> = ({ open, onOffline, onOnline, onSandbox, onServers, onBack }) => (
  <GamePopup open={open} kicker="Game Gate" title="Choose how to enter" onClose={onBack}>
    <div className="gate-choices">
      <button type="button" onClick={onOffline}>
        <strong>Offline</strong>
        <span>{hasOfflineSave() ? 'Load local save' : 'New local profile'} · NPCs & quests on this device</span>
      </button>
      <button type="button" onClick={onOnline}>
        <strong>Online</strong>
        <span>Login, then pick an official or community shard</span>
      </button>
      <button type="button" onClick={onSandbox}>
        <strong>Sandbox</strong>
        <span>Governor + AI VM · claim land, plant flags, found a state</span>
      </button>
      <button type="button" onClick={onServers}>
        <strong>Servers</strong>
        <span>Browser, add server, direct connect, or host</span>
      </button>
    </div>
  </GamePopup>
);
