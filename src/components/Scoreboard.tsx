import React from 'react';
import { GameState } from '../game/Engine';
import { Trophy, RefreshCw, Flag } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScoreboardProps {
  state: GameState;
  onRestart: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ state, onRestart }) => {
  React.useEffect(() => {
    if (state.isGameOver && state.winningTeam === 'blue') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }, [state.isGameOver, state.winningTeam]);

  if (!state.isGameOver) return null;

  const isWin = state.winningTeam === 'blue';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-6 font-sans">
      <div className="flex flex-col items-center gap-6 w-full max-w-xl glass-panel-accent p-8 rounded-3xl border border-slate-700 text-center shadow-2xl animate-fade-in">
        <div className={`p-5 rounded-full ${isWin ? 'bg-amber-500/20 border border-amber-400 text-amber-400' : 'bg-red-500/20 border border-red-400 text-red-400'}`}>
          <Trophy className="w-12 h-12" />
        </div>

        <div>
          <h2 className={`text-4xl font-extrabold font-orbitron tracking-wider ${isWin ? 'text-blue-400' : 'text-red-500'}`}>
            {isWin ? 'VICTORY ACHIEVED' : 'MATCH DEFEAT'}
          </h2>
          <p className="text-sm text-slate-400 font-semibold mt-2">
            {isWin ? 'Blue Allied Forces Secured Conquest Supremacy!' : 'Red Syndicate Depleted Your Team Tickets!'}
          </p>
        </div>

        {/* Final Ticket Standing */}
        <div className="grid grid-cols-2 gap-4 w-full my-2 font-orbitron">
          <div className="p-4 rounded-2xl bg-blue-950/50 border border-blue-500/40">
            <div className="text-xs text-blue-400 font-bold">BLUE TICKETS</div>
            <div className="text-3xl font-black text-white mt-1">{state.blueTickets}</div>
          </div>
          <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40">
            <div className="text-xs text-red-400 font-bold">RED TICKETS</div>
            <div className="text-3xl font-black text-white mt-1">{state.redTickets}</div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-orbitron font-extrabold text-base tracking-wider shadow-lg transition-all hover:scale-105"
        >
          <RefreshCw className="w-5 h-5" />
          <span>PLAY AGAIN</span>
        </button>
      </div>
    </div>
  );
};
