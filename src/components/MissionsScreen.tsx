import React from 'react';
import { CheckCircle2, Circle, Coins, Zap, MapPin } from 'lucide-react';

export interface MissionData {
  id: number;
  mission_key: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  is_completed: boolean;
  reward_xp: number;
  reward_coins: number;
}

interface MissionsScreenProps {
  missions: MissionData[];
  onClaimReward: (id: number) => void;
}

export const MissionsScreen: React.FC<MissionsScreenProps> = ({ missions, onClaimReward }) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl h-full p-6 text-white font-orbitron select-none overflow-y-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-blue-400 tracking-wider">QUEST LOG & MISSIONS</h2>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Complete daily tasks, location-based walking goals, and story quests to earn XP & Coins.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {missions.map(m => {
          const isReadyToClaim = m.progress >= m.target && !m.is_completed;
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));

          return (
            <div
              key={m.id}
              className={`flex items-center justify-between p-5 rounded-2xl border backdrop-blur-md transition-all ${
                m.is_completed
                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                  : isReadyToClaim
                  ? 'bg-gradient-to-r from-blue-950/60 to-slate-900/80 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mt-1">
                  {m.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-blue-400" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{m.title}</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">{m.description}</p>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mt-3 w-64">
                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {m.progress}/{m.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reward & Action */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1 text-xs">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Coins className="w-3.5 h-3.5" /> +{m.reward_coins} Coins
                  </div>
                  <div className="flex items-center gap-1 text-purple-400 font-bold">
                    <Zap className="w-3.5 h-3.5" /> +{m.reward_xp} XP
                  </div>
                </div>

                <button
                  onClick={() => onClaimReward(m.id)}
                  disabled={m.is_completed || !isReadyToClaim}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all ${
                    m.is_completed
                      ? 'bg-slate-800 text-slate-500 cursor-default'
                      : isReadyToClaim
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg cursor-pointer animate-pulse'
                      : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {m.is_completed ? 'CLAIMED' : isReadyToClaim ? 'CLAIM' : 'IN PROGRESS'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
