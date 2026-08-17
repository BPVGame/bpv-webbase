import React from 'react';
import { GamePopup } from '../ui/GamePopup';

interface Props {
  open: boolean;
  onJoin: () => void;
  onCreate: () => void;
  onMine: () => void;
  onDirect: () => void;
  onBack: () => void;
}

export const MultiplayerMenu: React.FC<Props> = ({ open, onJoin, onCreate, onMine, onDirect, onBack }) => (
  <GamePopup open={open} kicker="Multiplayer" title="Play with others" onClose={onBack}>
    <div className="gate-choices">
      <button type="button" onClick={onJoin}>
        <strong>Join Server</strong>
        <span>Official, community, and saved shards</span>
      </button>
      <button type="button" onClick={onCreate}>
        <strong>Create Server</strong>
        <span>Advertise a self-hosted infinite world</span>
      </button>
      <button type="button" onClick={onMine}>
        <strong>My Servers</strong>
        <span>Saved custom connections</span>
      </button>
      <button type="button" onClick={onDirect}>
        <strong>Direct Connect</strong>
        <span>host:port</span>
      </button>
    </div>
  </GamePopup>
);
