import React, { useState } from 'react';
import { Users, UserPlus, Shield, MessageSquare, Award } from 'lucide-react';

export interface NearbyPlayer {
  id: number;
  username: string;
  level: number;
  avatar_skin: string;
  avatar_shirt: string;
}

interface FriendsScreenProps {
  nearbyPlayers: NearbyPlayer[];
  onAddFriend: (username: string) => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ nearbyPlayers, onAddFriend }) => {
  const [searchUsername, setSearchUsername] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername) return;
    onAddFriend(searchUsername);
    setSearchUsername('');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl h-full p-6 text-white font-orbitron select-none overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-emerald-400 tracking-wider">ONLINE FRIENDS & NEARBY PLAYERS</h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Connect with other trainers exploring nearby city districts & invite them to tournaments.
          </p>
        </div>

        {/* Add Friend Form */}
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Username..."
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans w-48"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>ADD</span>
          </button>
        </form>
      </div>

      {/* Nearby Players Grid */}
      <div className="grid grid-cols-2 gap-4">
        {nearbyPlayers.map(p => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-slate-700/60 hover:border-emerald-500/50 transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              {/* Mini Avatar Circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-700 shadow-inner font-bold text-slate-950 text-sm"
                style={{ backgroundColor: p.avatar_shirt || '#2563eb' }}
              >
                LVL {p.level}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{p.username}</h4>
                <span className="text-[10px] text-emerald-400 font-sans">Active in City Center</span>
              </div>
            </div>

            <button
              onClick={() => onAddFriend(p.username)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition-all"
              title="Send Friend Request"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
