import React from 'react';
import { Shield, Zap, Flame, ChevronUp } from 'lucide-react';

export interface FishCardData {
  id: number;
  card_slug: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  level: number;
  attack: number;
  defense: number;
  speed: number;
  description: string;
  /** Emoji Design Card face — pixel-era emoji used as the collectible art */
  emoji?: string;
}

interface FishCardViewProps {
  card: FishCardData;
  onUpgrade?: (cardId: number) => void;
  playerCoins?: number;
}

const RARITY_EMOJI: Record<string, string> = {
  Common: '🐟',
  Uncommon: '🐠',
  Rare: '🐡',
  Epic: '🦈',
  Legendary: '🐙',
  Mythic: '🐉'
};

const RARITY_STYLE: Record<
  string,
  { border: string; glow: string; badge: string; foil: string; ink: string }
> = {
  Mythic: {
    border: '#ec4899',
    glow: 'rgba(236,72,153,0.45)',
    badge: '#db2777',
    foil: 'linear-gradient(135deg,#ec4899,#a855f7,#38bdf8)',
    ink: '#f9a8d4'
  },
  Legendary: {
    border: '#f59e0b',
    glow: 'rgba(245,158,11,0.45)',
    badge: '#d97706',
    foil: 'linear-gradient(135deg,#fbbf24,#f59e0b,#fde68a)',
    ink: '#fcd34d'
  },
  Epic: {
    border: '#a855f7',
    glow: 'rgba(168,85,247,0.4)',
    badge: '#7c3aed',
    foil: 'linear-gradient(135deg,#c084fc,#7c3aed,#38bdf8)',
    ink: '#d8b4fe'
  },
  Rare: {
    border: '#3b82f6',
    glow: 'rgba(59,130,246,0.4)',
    badge: '#2563eb',
    foil: 'linear-gradient(135deg,#38bdf8,#2563eb,#00CBFF)',
    ink: '#93c5fd'
  },
  Uncommon: {
    border: '#10b981',
    glow: 'rgba(16,185,129,0.35)',
    badge: '#059669',
    foil: 'linear-gradient(135deg,#34d399,#059669)',
    ink: '#6ee7b7'
  },
  Common: {
    border: '#94a3b8',
    glow: 'rgba(148,163,184,0.25)',
    badge: '#475569',
    foil: 'linear-gradient(135deg,#64748b,#334155)',
    ink: '#cbd5e1'
  }
};

/**
 * Emoji Design Fish Card — framed like fishcard.svg (cyan/indigo holographic panels)
 * with an emoji face as the collectible artwork.
 */
export const FishCardView: React.FC<FishCardViewProps> = ({ card, onUpgrade, playerCoins = 0 }) => {
  const style = RARITY_STYLE[card.rarity] || RARITY_STYLE.Common;
  const emoji = card.emoji || RARITY_EMOJI[card.rarity] || '🐟';
  const upgradeCost = card.level * 100;
  const canUpgrade = playerCoins >= upgradeCost;
  const showFoil = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(card.rarity);

  return (
    <article
      className="emoji-design-card"
      style={
        {
          '--card-border': style.border,
          '--card-glow': style.glow,
          '--card-badge': style.badge,
          '--card-foil': style.foil,
          '--card-ink': style.ink
        } as React.CSSProperties
      }
    >
      {/* fishcard.svg inspired holographic frame layers */}
      <div className="edc-panel edc-panel-a" aria-hidden />
      <div className="edc-panel edc-panel-b" aria-hidden />
      <div className="edc-panel edc-panel-c" aria-hidden />
      {showFoil && <div className="edc-foil" aria-hidden />}

      <header className="edc-header">
        <div>
          <span className="edc-rarity">{card.rarity.toUpperCase()}</span>
          <h3 className="edc-title">{card.name}</h3>
        </div>
        <div className="edc-level">
          <span>LEVEL</span>
          <strong>LVL {card.level}</strong>
        </div>
      </header>

      <div className="edc-art">
        <div className="edc-emoji" role="img" aria-label={card.name}>
          {emoji}
        </div>
        {/* Pixel fish silhouette from fishcard.svg geometry (simplified) */}
        <svg className="edc-pixel-fish" viewBox="0 0 169 132" aria-hidden>
          <polygon
            fill="#00229D"
            opacity="0.35"
            points="169 58.7 169 36.7 158 36.7 158 25.7 132 25.7 132 36.7 121 36.7 121 22 110 22 110 11 95.5 11 95.5 0 36.7 0 36.7 11 22 11 22 22 11 22 11 36.7 0 36.7 0 95.3 11 95.3 11 110 22 110 22 121 36.7 121 36.7 132 95.5 132 95.5 121 110 121 110 110 121 110 121 95.3 132 95.3 132 106.3 158 106.3 158 95.3 169 95.3 169 73.3 158 73.3 158 58.7"
          />
        </svg>
        <span className="edc-serial">#BPV-{card.id.toString().padStart(4, '0')}</span>
      </div>

      <div className="edc-stats">
        <div>
          <span>
            <Flame size={12} /> ATK
          </span>
          <strong>{card.attack}</strong>
        </div>
        <div>
          <span>
            <Shield size={12} /> DEF
          </span>
          <strong>{card.defense}</strong>
        </div>
        <div>
          <span>
            <Zap size={12} /> SPD
          </span>
          <strong>{card.speed}</strong>
        </div>
      </div>

      <footer className="edc-footer">
        <p>{card.description}</p>
        {onUpgrade && (
          <button type="button" disabled={!canUpgrade} onClick={() => onUpgrade(card.id)}>
            <ChevronUp size={12} />
            {upgradeCost}g
          </button>
        )}
      </footer>
    </article>
  );
};
