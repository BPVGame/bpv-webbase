import React, { useState } from 'react';
import { Trophy, Users, Plus, Award, Play, Swords } from 'lucide-react';
import { GamePopup } from './GamePopup';
import { retroAudio } from '../game/AudioSynth';

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
  prize_card_slug?: string;
  district?: string;
}

interface TournamentPopupProps {
  open: boolean;
  onClose: () => void;
  tournaments: TournamentData[];
  joinedIds: number[];
  onCreateTournament: (name: string, description: string, maxPlayers: number, prize: string) => void;
  onJoinTournament: (id: number) => void;
  onBattleTournament: (id: number) => void;
}

export const TournamentPopup: React.FC<TournamentPopupProps> = ({
  open,
  onClose,
  tournaments,
  joinedIds,
  onCreateTournament,
  onJoinTournament,
  onBattleTournament
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [prize, setPrize] = useState('Rare Fish Card + 250 Coins');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateTournament(name.trim(), description, maxPlayers, prize);
    setShowCreate(false);
    setName('');
    setDescription('');
  };

  return (
    <GamePopup
      open={open}
      kicker="Arena Circuit"
      title="Tournaments"
      subtitle="Compete for Emoji Design Fish Cards without leaving IsoEarth"
      onClose={onClose}
      wide
      footer={
        <button
          type="button"
          className="pack-btn"
          onClick={() => {
            retroAudio.playClick();
            setShowCreate(true);
          }}
        >
          <Plus size={14} /> Host Tournament
        </button>
      }
    >
      <div className="tourney-list">
        {tournaments.map(t => {
          const joined = joinedIds.includes(t.id);
          const full = t.current_players >= t.max_players;
          return (
            <article key={t.id} className={`tourney-card ${joined ? 'joined' : ''}`}>
              <div className="tourney-card-top">
                <span className={`tourney-status ${t.status}`}>{t.status}</span>
                <span className="tourney-meta">
                  <Users size={13} /> {t.current_players}/{t.max_players}
                </span>
              </div>
              <h3>
                <Trophy size={16} /> {t.name}
              </h3>
              <p>{t.description}</p>
              <div className="tourney-prize">
                <Award size={14} />
                <span>{t.prize_description}</span>
              </div>
              <div className="tourney-actions">
                {!joined ? (
                  <button
                    type="button"
                    disabled={full || t.status === 'closed'}
                    onClick={() => {
                      retroAudio.playClick();
                      onJoinTournament(t.id);
                    }}
                  >
                    <Play size={13} /> Join
                  </button>
                ) : (
                  <button
                    type="button"
                    className="battle"
                    onClick={() => {
                      retroAudio.playQuestComplete();
                      onBattleTournament(t.id);
                    }}
                  >
                    <Swords size={13} /> Enter Battle
                  </button>
                )}
                <small>{t.start_time}</small>
              </div>
            </article>
          );
        })}
      </div>

      {showCreate && (
        <div className="tourney-create">
          <form onSubmit={handleSubmit}>
            <h3>Host New Tournament</h3>
            <label>
              Name
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Pixel Championship Cup" />
            </label>
            <label>
              Description
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Rules and vibe…" />
            </label>
            <div className="tourney-create-row">
              <label>
                Max players
                <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}>
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
              </label>
              <label>
                Prize
                <input value={prize} onChange={e => setPrize(e.target.value)} />
              </label>
            </div>
            <div className="tourney-create-actions">
              <button type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit">Publish</button>
            </div>
          </form>
        </div>
      )}
    </GamePopup>
  );
};
