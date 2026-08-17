import React from 'react';
import { GamePopup } from '../ui/GamePopup';
import { defaultOfflineProfile, loadOfflineProfile } from '../../game/gate/localProfile';

interface Props {
  open: boolean;
  onEnter: () => void;
  onBack: () => void;
}

export const OfflineLoad: React.FC<Props> = ({ open, onEnter, onBack }) => {
  const profile = loadOfflineProfile() ?? defaultOfflineProfile();
  return (
    <GamePopup
      open={open}
      kicker="Offline"
      title="Local profile"
      onClose={onBack}
      footer={
        <>
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button type="button" className="pause-resume" onClick={onEnter}>
            Load BPV World
          </button>
        </>
      }
    >
      <p>
        <strong>{profile.username}</strong> · Lv{profile.level} · {profile.coins} coins
      </p>
      <p className="gate-empty">
        Local NPCs, quests, inventory, and world time. ElloFive is optional — simulation continues if AI is down. No
        server required.
      </p>
    </GamePopup>
  );
};
