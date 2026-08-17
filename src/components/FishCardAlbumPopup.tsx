import React, { useMemo, useState } from 'react';
import { Lock, Sparkles, Package } from 'lucide-react';
import { FishCardView, FishCardData } from './FishCardView';
import { GamePopup } from './GamePopup';
import {
  FISH_CARD_CATALOG,
  PACK_COST,
  RARE_PACK_COST,
  FishCardDef,
  findCardDef
} from '../data/fishCards';
import { retroAudio } from '../game/AudioSynth';

interface FishCardAlbumPopupProps {
  open: boolean;
  onClose: () => void;
  owned: FishCardData[];
  coins: number;
  onUpgrade: (cardId: number) => void;
  onBuyPack: (rare: boolean) => void;
}

type Filter = 'all' | 'owned' | 'locked';

export const FishCardAlbumPopup: React.FC<FishCardAlbumPopupProps> = ({
  open,
  onClose,
  owned,
  coins,
  onUpgrade,
  onBuyPack
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(owned[0]?.card_slug ?? 'emoji_destin');

  const ownedMap = useMemo(() => {
    const m = new Map<string, FishCardData>();
    for (const c of owned) m.set(c.card_slug, c);
    return m;
  }, [owned]);

  const selectedDef = selectedSlug ? findCardDef(selectedSlug) : undefined;
  const selectedOwned = selectedSlug ? ownedMap.get(selectedSlug) : undefined;

  const list = FISH_CARD_CATALOG.filter(c => {
    const has = ownedMap.has(c.card_slug);
    if (filter === 'owned') return has;
    if (filter === 'locked') return !has;
    return true;
  });

  const ownedCount = owned.length;
  const total = FISH_CARD_CATALOG.length;

  return (
    <GamePopup
      open={open}
      kicker="Emoji Design"
      title="Fish Card Album"
      subtitle={`${ownedCount} / ${total} collected · holographic faces`}
      onClose={onClose}
      wide
      footer={
        <div className="album-footer-actions">
          <button
            type="button"
            className="pack-btn"
            disabled={coins < PACK_COST}
            onClick={() => {
              retroAudio.playClick();
              onBuyPack(false);
            }}
          >
            <Package size={14} /> Card Pack · {PACK_COST}g
          </button>
          <button
            type="button"
            className="pack-btn rare"
            disabled={coins < RARE_PACK_COST}
            onClick={() => {
              retroAudio.playClick();
              onBuyPack(true);
            }}
          >
            <Sparkles size={14} /> Rare Pack · {RARE_PACK_COST}g
          </button>
        </div>
      }
    >
      <div className="album-layout">
        <div className="album-list">
          <div className="album-filters">
            {(['all', 'owned', 'locked'] as Filter[]).map(f => (
              <button
                key={f}
                type="button"
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'owned' ? 'Owned' : 'To Earn'}
              </button>
            ))}
          </div>
          <div className="album-grid">
            {list.map(def => {
              const has = ownedMap.has(def.card_slug);
              return (
                <button
                  key={def.card_slug}
                  type="button"
                  className={`album-tile ${has ? 'owned' : 'locked'} ${selectedSlug === def.card_slug ? 'selected' : ''}`}
                  onClick={() => {
                    retroAudio.playClick();
                    setSelectedSlug(def.card_slug);
                  }}
                >
                  <span className="album-tile-face">{has ? def.emoji : '?'}</span>
                  <small>{has ? def.name : '????'}</small>
                  {!has && <Lock size={10} className="album-lock" />}
                  <em>{def.rarity}</em>
                </button>
              );
            })}
          </div>
        </div>

        <div className="album-inspect">
          {selectedOwned ? (
            <FishCardView card={selectedOwned} onUpgrade={onUpgrade} playerCoins={coins} />
          ) : selectedDef ? (
            <LockedCardPreview def={selectedDef} />
          ) : (
            <p className="album-empty">Select a card.</p>
          )}
        </div>
      </div>
    </GamePopup>
  );
};

const LockedCardPreview: React.FC<{ def: FishCardDef }> = ({ def }) => (
  <div className="locked-preview">
    <div className="locked-preview-art">
      <span>?</span>
    </div>
    <p className="locked-rarity">{def.rarity.toUpperCase()}</p>
    <h3>{def.name}</h3>
    <p className="locked-how">{def.howToEarn}</p>
    <p className="locked-blurb">{def.description}</p>
  </div>
);
