import React, { useEffect } from 'react';
import { FishCardData } from './FishCardView';

interface RewardToastProps {
  card: FishCardData | null;
  message?: string;
  onDismiss: () => void;
}

export const RewardToast: React.FC<RewardToastProps> = ({ card, message, onDismiss }) => {
  useEffect(() => {
    if (!card) return;
    const t = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(t);
  }, [card, onDismiss]);

  if (!card) return null;

  return (
    <div className="reward-toast" role="status">
      <div className="reward-toast-card">
        <span className="reward-toast-emoji">{card.emoji ?? '🐟'}</span>
        <div>
          <p className="pause-kicker">{message ?? 'New card earned'}</p>
          <strong>{card.name}</strong>
          <small>{card.rarity}</small>
        </div>
        <button type="button" onClick={onDismiss}>
          Nice
        </button>
      </div>
    </div>
  );
};
