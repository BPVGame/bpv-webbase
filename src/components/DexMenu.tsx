import React from 'react';
import { Play, Map, Award, Trophy, Layers, Users, User, Settings, Coins, Navigation, Volume2, VolumeX, Shield } from 'lucide-react';
import { retroAudio } from '../game/AudioSynth';

export type DexTab =
  | 'PLAY'
  | 'MAP'
  | 'MISSIONS'
  | 'TOURNAMENTS'
  | 'CARDS'
  | 'AVATAR'
  | 'FRIENDS'
  | 'SETTINGS';

interface DexMenuProps {
  activeTab: DexTab;
  onTabChange: (tab: DexTab) => void;
  player: { username: string; level: number; xp: number; coins: number };
  isOutdoorMode: boolean;
  currentDistrict: string;
}

export const DexMenu: React.FC<DexMenuProps> = ({
  activeTab,
  onTabChange,
  player,
  isOutdoorMode,
  currentDistrict
}) => {
  const [isMuted, setIsMuted] = React.useState(false);

  const tabs: Array<{ id: DexTab; label: string; icon: React.ReactNode }> = [
    { id: 'PLAY', label: 'WORLD', icon: <Play className="w-4 h-4 fill-current" /> },
    { id: 'CARDS', label: 'FISH CARDS', icon: <Layers className="w-4 h-4" /> },
    { id: 'TOURNAMENTS', label: 'TOURNAMENTS', icon: <Trophy className="w-4 h-4" /> },
    { id: 'MISSIONS', label: 'MISSIONS', icon: <Award className="w-4 h-4" /> },
    { id: 'AVATAR', label: 'AVATAR', icon: <User className="w-4 h-4" /> },
    { id: 'FRIENDS', label: 'FRIENDS', icon: <Users className="w-4 h-4" /> }
  ];

  const handleToggleSound = () => {
    const muted = retroAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="w-full flex items-center justify-between px-6 py-3 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 font-orbitron select-none z-40">
      {/* Brand Title & Mode Indicator */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-blue-400 tracking-widest">
          BPV DEX
        </h1>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px]">
          <Navigation className={`w-3 h-3 ${isOutdoorMode ? 'text-emerald-400 animate-pulse' : 'text-blue-400'}`} />
          <span className="text-slate-300 font-bold uppercase">{isOutdoorMode ? 'OUTDOOR GPS' : 'INDOOR MODE'}</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-semibold">{currentDistrict}</span>
        </div>
      </div>

      {/* Navigation Tabs (ui-menu-dex style) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                retroAudio.playClick();
                onTabChange(t.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Player Stats & Sound Toggle */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          {/* Level Badge */}
          <div className="px-2.5 py-1 rounded-lg bg-blue-600/30 border border-blue-500 text-blue-300 text-xs font-bold">
            LVL {player.level}
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <Coins className="w-4 h-4" />
            <span>{player.coins}</span>
          </div>
        </div>

        {/* Mute Toggle */}
        <button
          onClick={handleToggleSound}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
};
