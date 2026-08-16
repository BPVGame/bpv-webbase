import React from 'react';
import { Menu, Coins, Heart, Volume2, VolumeX, MapPin } from 'lucide-react';
import { retroAudio } from '../game/AudioSynth';

interface GameHUDProps {
  player: { username: string; level: number; coins: number };
  district: string;
  isOutdoor: boolean;
  metersWalked: number;
  health?: number;
  maxHealth?: number;
  onOpenMenu: () => void;
  onToggleInventory: () => void;
  equippedLabel?: string;
  equippedCount?: number;
}

/**
 * In-world HUD — cozy RPG chrome that stays out of the playfield center.
 * Inspired by full-screen 16-bit town/field UIs (time, HP, hotbar, inventory).
 */
export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  district,
  isOutdoor,
  metersWalked,
  health = 8,
  maxHealth = 10,
  onOpenMenu,
  onToggleInventory,
  equippedLabel = 'Fish Charm',
  equippedCount = 3
}) => {
  const [muted, setMuted] = React.useState(false);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="game-hud pointer-events-none">
      {/* Top-right clock */}
      <div className="hud-clock pointer-events-auto">
        <span className="hud-day">{dayStr}</span>
        <span className="hud-time">{timeStr}</span>
        <span className="hud-moon" aria-hidden>
          ☀️
        </span>
      </div>

      {/* Top-left brand + district (minimal) */}
      <div className="hud-brand pointer-events-none">
        <strong>BPV</strong>
        <span>
          <MapPin size={11} /> {district}
          {isOutdoor ? ' · GPS' : ''}
        </span>
      </div>

      {/* Menu burger */}
      <button type="button" className="hud-menu-btn pointer-events-auto" onClick={onOpenMenu} aria-label="Open menu">
        <Menu size={18} />
      </button>

      {/* Bottom-left vitals + hotbar */}
      <div className="hud-vitals pointer-events-auto">
        <div className="hud-hp">
          <Heart size={12} className="hud-hp-icon" />
          <div className="hud-hp-track">
            <div className="hud-hp-fill" style={{ width: `${(health / maxHealth) * 100}%` }} />
          </div>
        </div>
        <div className="hud-hotbar">
          {['🧹', '🎣', '🧪', '📦', '🔑'].map((icon, i) => (
            <button
              key={i}
              type="button"
              className={`hud-slot ${i === 1 ? 'active' : ''}`}
              onClick={() => {
                retroAudio.playClick();
                if (i === 3) onToggleInventory();
              }}
            >
              <span>{icon}</span>
            </button>
          ))}
        </div>
        <div className="hud-coins">
          <Coins size={13} />
          <span>{player.coins}</span>
          <span className="hud-lvl">Lv{player.level}</span>
        </div>
      </div>

      {/* Bottom-right equipped */}
      <div className="hud-equipped pointer-events-none">
        <div className="hud-equipped-frame">
          <span className="hud-equipped-icon">✨</span>
          <div>
            <small>EQUIPPED</small>
            <strong>
              {equippedLabel} ×{equippedCount}
            </strong>
          </div>
        </div>
        <p className="hud-hint">
          WASD move · I bag · Esc menu · {metersWalked}m walked
        </p>
      </div>

      {/* Mute */}
      <button
        type="button"
        className="hud-mute pointer-events-auto"
        onClick={() => setMuted(retroAudio.toggleMute())}
        aria-label="Toggle sound"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
};
