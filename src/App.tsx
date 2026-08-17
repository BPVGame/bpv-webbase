/**
 * BPV Game — full-screen cozy 16-bit RPG shell.
 */

import React, { useEffect, useRef, useState } from 'react';
import { LocationService, DistrictName } from './game/LocationService';
import { DexTab } from './components/DexMenu';
import { FishCardView, FishCardData } from './components/FishCardView';
import { TournamentScreen, TournamentData } from './components/TournamentScreen';
import { MissionsScreen, MissionData } from './components/MissionsScreen';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { FriendsScreen, NearbyPlayer } from './components/FriendsScreen';
import { IsoEarthView, IsoEarthViewHandle } from './components/IsoEarthView';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { InventoryPanel } from './components/InventoryPanel';
import { retroAudio } from './game/AudioSynth';
import { DistrictRealm } from './game/iso/IsoTiles';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

const STARTER_CARDS: FishCardData[] = [
  {
    id: 101,
    card_slug: 'neon_guppy',
    name: 'Neon Pixel Guppy',
    rarity: 'Common',
    level: 2,
    attack: 25,
    defense: 18,
    speed: 35,
    description: 'A swift pixelated freshwater guppy glowing in cyan neon.',
    emoji: '🐟'
  },
  {
    id: 102,
    card_slug: 'cyber_bass',
    name: 'Cyber Bass',
    rarity: 'Uncommon',
    level: 1,
    attack: 45,
    defense: 38,
    speed: 28,
    description: 'Aggressive robotic bass with laser fins and armored scales.',
    emoji: '🐠'
  },
  {
    id: 103,
    card_slug: 'plasma_salmon',
    name: 'Plasma Salmon',
    rarity: 'Rare',
    level: 1,
    attack: 75,
    defense: 62,
    speed: 55,
    description: 'Legendary river runner glowing with plasma energy.',
    emoji: '🐡'
  },
  {
    id: 104,
    card_slug: 'quantum_kraken',
    name: 'Quantum Kraken',
    rarity: 'Legendary',
    level: 3,
    attack: 140,
    defense: 125,
    speed: 95,
    description: 'Deep sea mythic organism capable of warping space.',
    emoji: '🐙'
  },
  {
    id: 105,
    card_slug: 'emoji_destin',
    name: 'Emoji Destin',
    rarity: 'Epic',
    level: 1,
    attack: 88,
    defense: 70,
    speed: 80,
    description: 'Emoji Design Card — holographic destin fish born from IsoEarth tides.',
    emoji: '✨'
  }
];

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
  const [tournaments, setTournaments] = useState<TournamentData[]>([
    {
      id: 1,
      name: 'Pixel Championship Cup',
      description: 'Official BPV Fish Card championship battle.',
      max_players: 16,
      current_players: 12,
      status: 'open',
      prize_description: '3 Rare Fish Cards + 500 Coins',
      start_time: 'Starting Soon'
    },
    {
      id: 2,
      name: 'Harbor Masters League',
      description: 'Location-based aquatic tournament.',
      max_players: 8,
      current_players: 6,
      status: 'open',
      prize_description: 'Legendary Quantum Kraken Card',
      start_time: 'In 20 mins'
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
      reward_coins: 150
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
      reward_coins: 80
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
      reward_coins: 300
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
      if (e.code === 'Escape') {
        if (activeTab !== 'PLAY') {
          setActiveTab('PLAY');
        } else {
          setMenuOpen(m => !m);
          setInventoryOpen(false);
        }
      }
      if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        if (activeTab === 'PLAY' && !menuOpen) setInventoryOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, menuOpen]);

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

  const handleClaimMission = (missionId: number) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.is_completed) return;
    retroAudio.playQuestComplete();
    setPlayer(p => ({ ...p, coins: p.coins + mission.reward_coins, xp: p.xp + mission.reward_xp }));
    setMissions(prev => prev.map(m => (m.id === missionId ? { ...m, is_completed: true } : m)));
  };

  const handleCreateTournament = (name: string, description: string, maxPlayers: number, prize: string) => {
    retroAudio.playClick();
    setTournaments([
      {
        id: Date.now(),
        name,
        description,
        max_players: maxPlayers,
        current_players: 1,
        status: 'open',
        prize_description: prize,
        start_time: 'Starting Soon'
      },
      ...tournaments
    ]);
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

  const playing = activeTab === 'PLAY';

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
              setActiveTab(tab);
            }}
          />

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
              <p>Collectible holographic cards — tournament loot & IsoEarth drops.</p>
              <div className="dex-cards">
                {cards.map(c => (
                  <FishCardView key={c.id} card={c} onUpgrade={handleUpgradeCard} playerCoins={player.coins} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'TOURNAMENTS' && (
            <TournamentScreen
              tournaments={tournaments}
              onCreateTournament={handleCreateTournament}
              onJoinTournament={id => alert(`Joined Tournament #${id}!`)}
            />
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
