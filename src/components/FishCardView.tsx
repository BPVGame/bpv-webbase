import React from 'react';
import { Shield, Zap, Flame, Award, ChevronUp } from 'lucide-react';

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
}

interface FishCardViewProps {
  card: FishCardData;
  onUpgrade?: (cardId: number) => void;
  playerCoins?: number;
}

export const FishCardView: React.FC<FishCardViewProps> = ({ card, onUpgrade, playerCoins = 0 }) => {
  const getRarityColors = (rarity: string) => {
    switch (rarity) {
      case 'Mythic':
        return { border: '#ec4899', bg: 'from-pink-950 via-slate-900 to-purple-950', text: 'text-pink-400', badge: 'bg-pink-600' };
      case 'Legendary':
        return { border: '#f59e0b', bg: 'from-amber-950 via-slate-900 to-yellow-950', text: 'text-amber-400', badge: 'bg-amber-500' };
      case 'Epic':
        return { border: '#a855f7', bg: 'from-purple-950 via-slate-900 to-indigo-950', text: 'text-purple-400', badge: 'bg-purple-600' };
      case 'Rare':
        return { border: '#3b82f6', bg: 'from-blue-950 via-slate-900 to-cyan-950', text: 'text-blue-400', badge: 'bg-blue-600' };
      case 'Uncommon':
        return { border: '#10b981', bg: 'from-emerald-950 via-slate-900 to-teal-950', text: 'text-emerald-400', badge: 'bg-emerald-600' };
      default:
        return { border: '#94a3b8', bg: 'from-slate-900 via-slate-900 to-slate-950', text: 'text-slate-400', badge: 'bg-slate-600' };
    }
  };

  const colors = getRarityColors(card.rarity);
  const upgradeCost = card.level * 100;
  const canUpgrade = playerCoins >= upgradeCost;

  return (
    <div
      className={`relative flex flex-col justify-between w-64 h-96 p-4 rounded-3xl bg-gradient-to-b ${colors.bg} border-2 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] font-orbitron select-none`}
      style={{ borderColor: colors.border }}
    >
      {/* Holographic foil overlay for Rare+ */}
      {['Rare', 'Epic', 'Legendary', 'Mythic'].includes(card.rarity) && (
        <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-tr from-transparent via-white to-transparent pointer-events-none animate-pulse"></div>
      )}

      {/* Top Card Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white ${colors.badge} tracking-wider`}>
            {card.rarity.toUpperCase()}
          </span>
          <h3 className="text-base font-extrabold text-white mt-1 tracking-wide">{card.name}</h3>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 font-semibold">LEVEL</span>
          <span className="text-lg font-black text-amber-400">LVL {card.level}</span>
        </div>
      </div>

      {/* SVG Fish Artwork Frame (16-Bit Pixel Fish SVG) */}
      <div className="relative flex items-center justify-center w-full h-36 my-2 rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-inner">
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]">
          {/* Fish Tail */}
          <polygon points="15,50 35,35 35,65" fill={colors.border} />
          {/* Fish Body */}
          <ellipse cx="60" cy="50" rx="30" ry="20" fill={colors.border} />
          {/* Stripes */}
          <path d="M 50 32 Q 55 50 50 68" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.7" />
          <path d="M 65 30 Q 70 50 65 70" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.7" />
          {/* Eye */}
          <circle cx="78" cy="45" r="4" fill="#ffffff" />
          <circle cx="79" cy="45" r="2" fill="#000000" />
          {/* Fins */}
          <polygon points="55,30 65,15 75,30" fill={colors.border} />
        </svg>

        <span className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-sans">
          #BPV-{card.id.toString().padStart(4, '0')}
        </span>
      </div>

      {/* Stats Badges (Attack, Defense, Speed) */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs z-10">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-red-400 font-bold text-[10px]">
            <Flame className="w-3 h-3" /> ATK
          </div>
          <div className="text-sm font-extrabold text-white mt-0.5">{card.attack}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-blue-400 font-bold text-[10px]">
            <Shield className="w-3 h-3" /> DEF
          </div>
          <div className="text-sm font-extrabold text-white mt-0.5">{card.defense}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-[10px]">
            <Zap className="w-3 h-3" /> SPD
          </div>
          <div className="text-sm font-extrabold text-white mt-0.5">{card.speed}</div>
        </div>
      </div>

      {/* Description & Upgrade */}
      <div className="mt-2 z-10 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
        <p className="text-[10px] text-slate-400 font-sans line-clamp-2 leading-snug">
          {card.description}
        </p>

        {onUpgrade && (
          <button
            onClick={() => onUpgrade(card.id)}
            disabled={!canUpgrade}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              canUpgrade
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer'
                : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <ChevronUp className="w-3 h-3" />
            <span>{upgradeCost}g</span>
          </button>
        )}
      </div>
    </div>
  );
};
