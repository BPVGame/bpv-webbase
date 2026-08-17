/**
 * BPV Game — full-screen cozy 16-bit RPG shell.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LocationService, DistrictName } from './game/LocationService';
import { DexTab } from './components/DexMenu';
import { FishCardData } from './components/FishCardView';
import { TournamentData } from './components/TournamentPopup';
import { MissionsScreen, MissionData } from './components/MissionsScreen';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { FriendsScreen, NearbyPlayer } from './components/FriendsScreen';
import { IsoEarthView, IsoEarthViewHandle } from './components/IsoEarthView';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { InventoryPanel } from './components/InventoryPanel';
import { FishCardAlbumPopup } from './components/FishCardAlbumPopup';
import { TournamentPopup } from './components/TournamentPopup';
import { RewardToast } from './components/RewardToast';
import { retroAudio } from './game/AudioSynth';
import { DistrictRealm } from './game/iso/IsoTiles';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  starterCards,
  findCardDef,
  defToOwned,
  rollPackCard,
  PACK_COST,
  RARE_PACK_COST
} from './data/fishCards';

const STARTER_CARDS: FishCardData[] = starterCards();

export const App: React.FC = () => {
  const earthRef = useRef<IsoEarthViewHandle>(null);
  const locationServiceRef = useRef<LocationService | null>(null);

  const [activeTab, setActiveTab] = useState<DexTab>('PLAY');
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [realm, setRealm] = useState<DistrictRealm>('city_center');
  const [isOutdoorMode, setIsOutdoorMode] = useState(false);
  const [currentDistrict, setCurrentDistrict] = useState<DistrictName | string>('City Center');
  const [totalMeters, setTotalMeters] = useState(120);

  const [player, setPlayer] = useState({
    id: 1,
    username: 'Trainer_Ash',
    level: 3,
    xp: 450,
    coins: 650,
    avatar_skin: '#f3d5b5',
    avatar_hair: '#3d2914',
    avatar_shirt: '#3a5a8c',
    avatar_pants: '#2c3e50'
  });

  const [cards, setCards] = useState<FishCardData[]>(STARTER_CARDS);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [tournamentsOpen, setTournamentsOpen] = useState(false);
  const [joinedTournaments, setJoinedTournaments] = useState<number[]>([2]);
  const [rewardCard, setRewardCard] = useState<FishCardData | null>(null);
  const [rewardMessage, setRewardMessage] = useState('New card earned');
  const [tournaments, setTournaments] = useState<TournamentData[]>([
    {
      id: 1,
      name: 'Pixel Championship Cup',
      description: 'Official BPV Fish Card championship — win Champion Tuna.',
      max_players: 16,
      current_players: 12,
      status: 'open',
      prize_description: 'Champion Tuna + 500 Coins',
      start_time: 'Starting Soon',
      prize_card_slug: 'tournament_tuna'
    },
    {
      id: 2,
      name: 'Harbor Masters League',
      description: 'Dockside bouts. Join to earn Dockside Crab.',
      max_players: 8,
      current_players: 6,
      status: 'open',
      prize_description: 'Dockside Crab + Tide Angelfish',
      start_time: 'In 20 mins',
      prize_card_slug: 'dock_crab'
    },
    {
      id: 3,
      name: 'Night Tide Invitational',
      description: 'Moonlit arena under Pixel Harbor lanterns.',
      max_players: 8,
      current_players: 3,
      status: 'open',
      prize_description: 'Lunar Jelly (Legendary)',
      start_time: 'Tonight',
      prize_card_slug: 'lunar_jellyfish'
    },
    {
      id: 4,
      name: 'Storm Circuit',
      description: 'Rain-soaked river battles. Pack heat and Storm Eels.',
      max_players: 12,
      current_players: 7,
      status: 'open',
      prize_description: 'Storm Eel + 200 Coins',
      start_time: 'After rain',
      prize_card_slug: 'storm_eel'
    },
    {
      id: 5,
      name: 'Arena Ink Cup',
      description: 'Tournament Hub showcase hosted by Card Master Finn.',
      max_players: 16,
      current_players: 9,
      status: 'open',
      prize_description: 'Ink Octopus (Epic)',
      start_time: 'Open now',
      prize_card_slug: 'ink_octopus'
    }
  ]);
  const [missions, setMissions] = useState<MissionData[]>([
    {
      id: 1,
      mission_key: 'walk_500m',
      title: 'City Explorer',
      description: 'Walk 500 meters in Outdoor Mode or explore the district.',
      progress: 340,
      target: 500,
      is_completed: false,
      reward_xp: 100,
      reward_coins: 150,
      reward_card_slug: 'meadow_trout'
    },
    {
      id: 2,
      mission_key: 'talk_npc',
      title: 'Meet the Local NPCs',
      description: 'Talk to 3 local NPCs in the City Center.',
      progress: 2,
      target: 3,
      is_completed: false,
      reward_xp: 50,
      reward_coins: 80,
      reward_card_slug: 'garden_goldfish'
    },
    {
      id: 3,
      mission_key: 'join_tournament',
      title: 'Challenger',
      description: 'Join or create your first Fish Card tournament.',
      progress: 1,
      target: 1,
      is_completed: true,
      reward_xp: 150,
      reward_coins: 300,
      reward_card_slug: 'spark_seahorse'
    }
  ]);
  const [nearbyPlayers] = useState<NearbyPlayer[]>([
    { id: 2, username: 'PixelMaster_99', level: 5, avatar_skin: '#fed7aa', avatar_shirt: '#dc2626' },
    { id: 3, username: 'AquaRider', level: 4, avatar_skin: '#fbcfe8', avatar_shirt: '#10b981' },
    { id: 4, username: 'CyberFisher', level: 7, avatar_skin: '#78350f', avatar_shirt: '#7c3aed' }
  ]);
  const [worldClock, setWorldClock] = useState({ dayStr: 'DAY 1', timeStr: '08:00', weatherIcon: '☀️' });
  const talkedNpcs = useRef(new Set<string>());

  useEffect(() => {
    const id = setInterval(() => {
      const t = earthRef.current?.getWorldTime();
      if (!t) return;
      const icon =
        t.weather === 'storm'
          ? '⛈️'
          : t.weather === 'rain'
            ? '🌧️'
            : t.weather === 'fog'
              ? '🌫️'
              : t.weather === 'cloudy'
                ? '⛅'
                : '☀️';
      setWorldClock({ dayStr: t.date.toUpperCase(), timeStr: t.time, weatherIcon: icon });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const onNpcTalked = (npcId: string) => {
    if (talkedNpcs.current.has(npcId)) return;
    talkedNpcs.current.add(npcId);
    setMissions(prev =>
      prev.map(m => {
        if (m.mission_key !== 'talk_npc' || m.is_completed) return m;
        return { ...m, progress: Math.min(m.target, m.progress + 1) };
      })
    );
  };
  useEffect(() => {
    const locService = new LocationService();
    locationServiceRef.current = locService;
    locService.startTracking((_coords, district, meters) => {
      setIsOutdoorMode(locService.isOutdoorMode);
      setCurrentDistrict(district);
      setTotalMeters(Math.floor(meters));
      setMissions(prev =>
        prev.map(m => (m.mission_key === 'walk_500m' ? { ...m, progress: Math.min(m.target, Math.floor(meters)) } : m))
      );
    });
    return () => locService.stopTracking();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.code === 'Escape') {
        if (cardsOpen) {
          setCardsOpen(false);
        } else if (tournamentsOpen) {
          setTournamentsOpen(false);
        } else if (activeTab !== 'PLAY') {
          setActiveTab('PLAY');
        } else {
          setMenuOpen(m => !m);
          setInventoryOpen(false);
        }
      }
      if (typing) return;
      if (e.code === 'KeyC' && activeTab === 'PLAY' && !menuOpen) {
        setCardsOpen(v => !v);
        setTournamentsOpen(false);
      }
      if (e.code === 'KeyT' && activeTab === 'PLAY' && !menuOpen) {
        setTournamentsOpen(v => !v);
        setCardsOpen(false);
      }
      if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        if (activeTab === 'PLAY' && !menuOpen) setInventoryOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, menuOpen, cardsOpen, tournamentsOpen]);

  const grantCard = (slug: string, message: string): FishCardData | null => {
    const def = findCardDef(slug);
    if (!def) return null;
    if (cards.some(c => c.card_slug === slug)) return null;
    const granted = defToOwned(def);
    setCards(prev => (prev.some(c => c.card_slug === slug) ? prev : [...prev, granted]));
    setRewardCard(granted);
    setRewardMessage(message);
    retroAudio.playItemPickup();
    return granted;
  };

  const handleUpgradeCard = (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const cost = card.level * 100;
    if (player.coins < cost) return;
    retroAudio.playItemPickup();
    setPlayer(p => ({ ...p, coins: p.coins - cost }));
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? { ...c, level: c.level + 1, attack: c.attack + 12, defense: c.defense + 10, speed: c.speed + 8 }
          : c
      )
    );
  };

  const handleBuyPack = (rare: boolean) => {
    const cost = rare ? RARE_PACK_COST : PACK_COST;
    if (player.coins < cost) return;
    setPlayer(p => ({ ...p, coins: p.coins - cost }));
    const ownedSlugs = new Set(cards.map(c => c.card_slug));
    const def = rollPackCard(ownedSlugs, rare);
    const granted = defToOwned(def);
    setCards(prev => (prev.some(c => c.card_slug === def.card_slug) ? prev : [...prev, granted]));
    setRewardCard(granted);
    setRewardMessage(rare ? 'Rare Pack opened' : 'Card Pack opened');
    retroAudio.playQuestComplete();
  };

  const handleClaimMission = (missionId: number) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.is_completed) return;
    retroAudio.playQuestComplete();
    setPlayer(p => ({ ...p, coins: p.coins + mission.reward_coins, xp: p.xp + mission.reward_xp }));
    setMissions(prev => prev.map(m => (m.id === missionId ? { ...m, is_completed: true } : m)));
    if (mission.reward_card_slug) grantCard(mission.reward_card_slug, `Quest reward: ${mission.title}`);
  };

  const handleCreateTournament = (name: string, description: string, maxPlayers: number, prize: string) => {
    retroAudio.playClick();
    const id = Date.now();
    setTournaments([
      {
        id,
        name,
        description,
        max_players: maxPlayers,
        current_players: 1,
        status: 'open',
        prize_description: prize,
        start_time: 'Starting Soon',
        prize_card_slug: 'pixel_piranha'
      },
      ...tournaments
    ]);
    setJoinedTournaments(prev => [...prev, id]);
    setMissions(prev =>
      prev.map(m =>
        m.mission_key === 'join_tournament' && !m.is_completed
          ? { ...m, progress: Math.min(m.target, m.progress + 1) }
          : m
      )
    );
  };

  const handleJoinTournament = (id: number) => {
    const t = tournaments.find(x => x.id === id);
    if (!t || joinedTournaments.includes(id)) return;
    setJoinedTournaments(prev => [...prev, id]);
    setTournaments(prev =>
      prev.map(x => (x.id === id ? { ...x, current_players: Math.min(x.max_players, x.current_players + 1) } : x))
    );
    setMissions(prev =>
      prev.map(m =>
        m.mission_key === 'join_tournament' && !m.is_completed
          ? { ...m, progress: Math.min(m.target, m.progress + 1) }
          : m
      )
    );
    if (t.prize_card_slug === 'dock_crab' || t.prize_card_slug === 'pixel_piranha') {
      grantCard(t.prize_card_slug, `Joined ${t.name}`);
    } else {
      grantCard('coral_minnow', `Entry gift from ${t.name}`);
    }
    setPlayer(p => ({ ...p, coins: p.coins + 25 }));
  };

  const handleBattleTournament = (id: number) => {
    const t = tournaments.find(x => x.id === id);
    if (!t) return;
    const win = Math.random() > 0.35;
    if (win) {
      setPlayer(p => ({ ...p, coins: p.coins + 180, xp: p.xp + 80 }));
      if (t.prize_card_slug) grantCard(t.prize_card_slug, `Victory — ${t.name}`);
      else grantCard('tide_angelfish', `Victory — ${t.name}`);
    } else {
      setPlayer(p => ({ ...p, coins: p.coins + 40, xp: p.xp + 20 }));
      grantCard('candy_clownfish', `Consolation from ${t.name}`);
    }
  };

  const handleSaveAvatar = (newAvatar: {
    username: string;
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
  }) => {
    retroAudio.playItemPickup();
    setPlayer(p => ({
      ...p,
      username: newAvatar.username,
      avatar_skin: newAvatar.skin,
      avatar_hair: newAvatar.hair,
      avatar_shirt: newAvatar.shirt,
      avatar_pants: newAvatar.pants
    }));
    setActiveTab('PLAY');
  };

  const handleDpad = (dir: { x: number; y: number }) => {
    earthRef.current?.setJoystick(dir);
  };

  const onDistrictChange = (next: DistrictRealm) => {
    setRealm(next);
    const labels: Record<DistrictRealm, string> = {
      city_center: 'City Center',
      residential: 'Residential',
      central_park: 'Central Park',
      pixel_harbor: 'Pixel Harbor',
      shopping_outpost: 'Shopping Outpost',
      tournament_arena: 'Tournament Arena',
      mixed: 'Mixed Earth'
    };
    setCurrentDistrict(labels[next]);
  };

  const avatar = {
    username: player.username,
    skin: player.avatar_skin,
    hair: player.avatar_hair,
    shirt: player.avatar_shirt,
    pants: player.avatar_pants
  };

  const dismissReward = useCallback(() => setRewardCard(null), []);
  const playing = activeTab === 'PLAY';

  const openCards = () => {
    setMenuOpen(false);
    setTournamentsOpen(false);
    setCardsOpen(true);
    setActiveTab('PLAY');
  };

  const openTournaments = () => {
    setMenuOpen(false);
    setCardsOpen(false);
    setTournamentsOpen(true);
    setActiveTab('PLAY');
  };

  return (
    <div className="game-root">
      <IsoEarthView
        ref={earthRef}
        avatar={avatar}
        visible={playing}
        onDistrictChange={onDistrictChange}
        onNpcTalked={onNpcTalked}
      />

      {playing && (
        <>
          <GameHUD
            player={player}
            district={String(currentDistrict)}
            isOutdoor={isOutdoorMode}
            metersWalked={totalMeters}
            onOpenMenu={() => {
              retroAudio.playClick();
              setMenuOpen(true);
            }}
            onToggleInventory={() => setInventoryOpen(v => !v)}
            onOpenCards={openCards}
            onOpenTournaments={openTournaments}
            equippedLabel="Fish Cards"
            equippedCount={cards.length}
            worldClock={worldClock}
          />

          <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} gold={player.coins} />

          <PauseMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            playerName={player.username}
            currentRealm={realm}
            onDistrict={r => earthRef.current?.loadDistrict(r)}
            onNavigate={tab => {
              setMenuOpen(false);
              if (tab === 'CARDS') {
                openCards();
                return;
              }
              if (tab === 'TOURNAMENTS') {
                openTournaments();
                return;
              }
              setActiveTab(tab);
            }}
          />

          <FishCardAlbumPopup
            open={cardsOpen}
            onClose={() => setCardsOpen(false)}
            owned={cards}
            coins={player.coins}
            onUpgrade={handleUpgradeCard}
            onBuyPack={handleBuyPack}
          />

          <TournamentPopup
            open={tournamentsOpen}
            onClose={() => setTournamentsOpen(false)}
            tournaments={tournaments}
            joinedIds={joinedTournaments}
            onCreateTournament={handleCreateTournament}
            onJoinTournament={handleJoinTournament}
            onBattleTournament={handleBattleTournament}
          />

          <RewardToast card={rewardCard} message={rewardMessage} onDismiss={dismissReward} />

          <div className="game-dpad">
            <button
              type="button"
              onMouseDown={() => handleDpad({ x: 0, y: -1 })}
              onMouseUp={() => handleDpad({ x: 0, y: 0 })}
              onTouchStart={() => handleDpad({ x: 0, y: -1 })}
              onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
            >
              <ChevronUp />
            </button>
            <div className="game-dpad-mid">
              <button
                type="button"
                onMouseDown={() => handleDpad({ x: -1, y: 0 })}
                onMouseUp={() => handleDpad({ x: 0, y: 0 })}
                onTouchStart={() => handleDpad({ x: -1, y: 0 })}
                onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onMouseDown={() => handleDpad({ x: 1, y: 0 })}
                onMouseUp={() => handleDpad({ x: 0, y: 0 })}
                onTouchStart={() => handleDpad({ x: 1, y: 0 })}
                onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
              >
                <ChevronRight />
              </button>
            </div>
            <button
              type="button"
              onMouseDown={() => handleDpad({ x: 0, y: 1 })}
              onMouseUp={() => handleDpad({ x: 0, y: 0 })}
              onTouchStart={() => handleDpad({ x: 0, y: 1 })}
              onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
            >
              <ChevronDown />
            </button>
          </div>
        </>
      )}

      {!playing && (
        <div className="dex-overlay">
          <button
            type="button"
            className="dex-back"
            onClick={() => {
              retroAudio.playClick();
              setActiveTab('PLAY');
            }}
          >
            <X size={16} /> Back to World
          </button>

          {activeTab === 'CARDS' && (
            <div className="dex-scroll">
              <h2>Emoji Design Fish Cards</h2>
              <p>Use the in-world album popup (C or ✨) — this fallback stays for older navigation.</p>
            </div>
          )}

          {activeTab === 'TOURNAMENTS' && (
            <div className="dex-scroll">
              <h2>Tournaments</h2>
              <p>Open the arena popup from the HUD trophy or pause menu.</p>
            </div>
          )}

          {activeTab === 'MISSIONS' && (
            <MissionsScreen missions={missions} onClaimReward={handleClaimMission} />
          )}

          {activeTab === 'AVATAR' && <AvatarCustomizer avatar={avatar} onSaveAvatar={handleSaveAvatar} />}

          {activeTab === 'FRIENDS' && (
            <FriendsScreen
              nearbyPlayers={nearbyPlayers}
              onAddFriend={username => alert(`Friend request sent to ${username}!`)}
            />
          )}
        </div>
      )}
    </div>
  );
};
