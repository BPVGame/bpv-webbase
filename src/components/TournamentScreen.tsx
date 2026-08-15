import React, { useState } from 'react';
import { Trophy, Users, Plus, Award, Play } from 'lucide-react';

export interface TournamentData {
  id: number;
  name: string;
  description: string;
  max_players: number;
  current_players: number;
  status: string;
  prize_description: string;
  start_time: string;
  creator_name?: string;
}

interface TournamentScreenProps {
  tournaments: TournamentData[];
  onCreateTournament: (name: string, description: string, maxPlayers: number, prize: string) => void;
  onJoinTournament: (id: number) => void;
}

export const TournamentScreen: React.FC<TournamentScreenProps> = ({
  tournaments,
  onCreateTournament,
  onJoinTournament
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [prize, setPrize] = useState('3 Rare Fish Cards + 500 Coins');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onCreateTournament(name, description, maxPlayers, prize);
    setShowCreateModal(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl h-full p-6 text-white font-orbitron select-none overflow-y-auto">
      {/* Top Header & Create Button */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-amber-400 tracking-wider">BPV TOURNAMENTS</h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Compete in online & location-based Fish Card tournaments for rare prizes!
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE TOURNAMENT</span>
        </button>
      </div>

      {/* Tournament Cards List */}
      <div className="grid grid-cols-2 gap-4">
        {tournaments.map(t => (
          <div
            key={t.id}
            className="flex flex-col justify-between p-5 rounded-2xl glass-panel border border-slate-700/60 hover:border-amber-500/50 transition-all shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600/30 border border-blue-500 text-blue-300">
                  {t.status.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  {t.current_players} / {t.max_players} Players
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-2">{t.name}</h3>
              <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed line-clamp-2">
                {t.description || 'Official BPV Fish Card championship battle.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Award className="w-4 h-4" />
                <span>{t.prize_description}</span>
              </div>

              <button
                onClick={() => onJoinTournament(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>JOIN</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-full max-w-md p-6 rounded-3xl glass-panel-accent border border-slate-700 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-amber-400">Host New Tournament</h3>

            <div>
              <label className="text-xs text-slate-400">Tournament Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Pixel Championship Cup"
                className="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tournament rules and details..."
                className="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 font-sans h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Max Players</label>
                <select
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-sans"
                >
                  <option value={8}>8 Players</option>
                  <option value={16}>16 Players</option>
                  <option value={32}>32 Players</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Prize Reward</label>
                <input
                  type="text"
                  value={prize}
                  onChange={e => setPrize(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Publish Tournament
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
