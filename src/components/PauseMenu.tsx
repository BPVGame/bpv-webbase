import React from 'react';
import { X, Layers, Trophy, Award, User, Users, Map as MapIcon } from 'lucide-react';
import { DexTab } from './DexMenu';
import { DISTRICT_REALMS, DistrictRealm } from '../game/iso/IsoTiles';
import { STARTER_EARTHS } from '../game/iso/IsoMapData';
import { retroAudio } from '../game/AudioSynth';

interface PauseMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: DexTab) => void;
  onDistrict: (realm: DistrictRealm) => void;
  currentRealm: DistrictRealm;
  playerName: string;
}

const NAV: Array<{ id: DexTab; label: string; icon: React.ReactNode }> = [
  { id: 'CARDS', label: 'Fish Cards', icon: <Layers size={18} /> },
  { id: 'TOURNAMENTS', label: 'Tournaments', icon: <Trophy size={18} /> },
  { id: 'MISSIONS', label: 'Missions', icon: <Award size={18} /> },
  { id: 'AVATAR', label: 'Avatar', icon: <User size={18} /> },
  { id: 'FRIENDS', label: 'Friends', icon: <Users size={18} /> }
];

export const PauseMenu: React.FC<PauseMenuProps> = ({
  open,
  onClose,
  onNavigate,
  onDistrict,
  currentRealm,
  playerName
}) => {
  if (!open) return null;

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true">
      <div className="pause-panel">
        <header className="pause-header">
          <div>
            <p className="pause-kicker">Paused</p>
            <h2>BPV Menu</h2>
            <span>{playerName}</span>
          </div>
          <button type="button" className="pause-close" onClick={onClose} aria-label="Resume">
            <X size={18} />
          </button>
        </header>

        <section className="pause-section">
          <h3>
            <MapIcon size={14} /> Travel IsoEarth
          </h3>
          <div className="pause-districts">
            {STARTER_EARTHS.map(id => {
              const meta = DISTRICT_REALMS.find(d => d.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  className={currentRealm === id ? 'active' : ''}
                  onClick={() => {
                    retroAudio.playClick();
                    onDistrict(id);
                    onClose();
                  }}
                >
                  {meta.emoji} {meta.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="pause-section">
          <h3>Dex</h3>
          <div className="pause-nav">
            {NAV.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onNavigate(item.id);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="pause-resume"
          onClick={() => {
            retroAudio.playClick();
            onClose();
          }}
        >
          Resume Adventure
        </button>
      </div>
    </div>
  );
};
