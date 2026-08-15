import React from 'react';
import { GameState } from '../game/Engine';
import { soundManager } from '../game/Sound';
import { Shield, Volume2, VolumeX, Crosshair, Zap, Flag, Car } from 'lucide-react';

interface HUDProps {
  state: GameState;
  onOpenClassPicker: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, onOpenClassPicker }) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.getMuted());

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const hpPercentage = Math.max(0, Math.min(100, (state.playerHp / state.playerMaxHp) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-6">
      {/* Top Banner - Tickets & Capture Point Status */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Ticket Score Bar */}
        <div className="flex items-center justify-between w-full max-w-2xl px-6 py-3 rounded-2xl glass-panel font-orbitron border border-slate-700/50 shadow-2xl">
          {/* Blue Team */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></div>
            <div>
              <div className="text-xs text-blue-400 font-bold tracking-wider uppercase">Blue Allied Forces</div>
              <div className="text-2xl font-extrabold text-white tracking-widest">{state.blueTickets}</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-semibold px-4 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            CONQUEST 64
          </div>

          {/* Red Team */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-xs text-red-400 font-bold tracking-wider uppercase">Red Syndicate</div>
              <div className="text-2xl font-extrabold text-white tracking-widest">{state.redTickets}</div>
            </div>
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></div>
          </div>
        </div>

        {/* Capture Point Flag Indicators (A, B, C) */}
        <div className="flex items-center gap-4">
          {state.capturePoints.map(cp => {
            const isBlue = cp.owner === 'blue';
            const isRed = cp.owner === 'red';
            return (
              <div
                key={cp.id}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border backdrop-blur-md font-orbitron text-sm transition-all duration-300 ${
                  isBlue
                    ? 'bg-blue-950/70 border-blue-500/60 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : isRed
                    ? 'bg-red-950/70 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-slate-900/70 border-slate-700 text-slate-400'
                }`}
              >
                <Flag className="w-4 h-4" />
                <span className="font-extrabold tracking-wider">{cp.id}</span>
                <span className="text-xs text-slate-300 font-sans">
                  {Math.abs(Math.round(cp.progress))}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center - Crosshair & Hitmarker */}
      <div className="crosshair-container">
        <div className="crosshair-center"></div>
        <div className="crosshair-line crosshair-top"></div>
        <div className="crosshair-line crosshair-bottom"></div>
        <div className="crosshair-line crosshair-left"></div>
        <div className="crosshair-line crosshair-right"></div>
      </div>

      {state.showHitmarker && <div className="hitmarker"></div>}

      {/* Vehicle Action Prompt */}
      {state.nearVehicle && !state.inVehicle && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-xl glass-panel border border-amber-500/40 text-amber-300 font-orbitron text-sm shadow-xl animate-bounce">
          <Car className="w-5 h-5 text-amber-400" />
          <span>Press <kbd className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400">E</kbd> to enter {state.nearVehicle.type.toUpperCase()}</span>
        </div>
      )}

      {/* Killfeed Notifications - Top Right */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 w-72">
        {state.killFeed.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-sans shadow-lg animate-fade-in"
          >
            <span className="font-bold text-blue-400">{item.killer}</span>
            <Crosshair className="w-3.5 h-3.5 text-red-500 mx-2" />
            <span className="font-semibold text-slate-300">{item.victim}</span>
          </div>
        ))}
      </div>

      {/* Bottom Bar - Health, Ammo, Weapon Info */}
      <div className="flex items-end justify-between w-full">
        {/* Health Bar & Class */}
        <div className="flex flex-col gap-2 w-72">
          <div className="flex items-center justify-between text-sm font-orbitron">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>HEALTH</span>
            </div>
            <span className="font-extrabold text-white text-lg">{state.playerHp}</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hpPercentage}%`,
                background:
                  hpPercentage > 50
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : hpPercentage > 25
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)'
              }}
            ></div>
          </div>
        </div>

        {/* Ammo Counter & Reloading */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end font-orbitron">
            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">
              {state.weaponName}
            </div>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-4xl font-black text-amber-400 tracking-tight">
                {state.playerAmmo}
              </span>
              <span className="text-xl font-bold text-slate-500">/ {state.playerMaxAmmo}</span>
            </div>
            {state.isReloading && (
              <span className="text-xs text-amber-400 font-bold animate-pulse mt-1">
                RELOADING...
              </span>
            )}
          </div>

          {/* Quick Sound Toggle & Controls Button */}
          <button
            onClick={handleToggleSound}
            className="pointer-events-auto p-3 rounded-xl glass-panel hover:border-blue-500/50 text-slate-300 hover:text-white transition-all shadow-lg"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};
