/**
 * BPV Game — Battle Pixel V foundation shell.
 * Classic 16-bit RPG IsoEarth + Outdoor GPS + Fish Cards + Tournaments + Multiplayer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { LocationService, DistrictName } from './game/LocationService';
import { DexMenu, DexTab } from './components/DexMenu';
import { FishCardView, FishCardData } from './components/FishCardView';
import { TournamentScreen, TournamentData } from './components/TournamentScreen';
import { MissionsScreen, MissionData } from './components/MissionsScreen';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { FriendsScreen, NearbyPlayer } from './components/FriendsScreen';
import { IsoEarthView } from './components/IsoEarthView';
import { retroAudio } from './game/AudioSynth';
import { DistrictRealm } from './game/iso/IsoTiles';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const dpadEarthRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const locationServiceRef = useRef<LocationService | null>(null);

  const [activeTab, setActiveTab] = useState<DexTab>('PLAY');
  const [isOutdoorMode, setIsOutdoorMode] = useState(false);
  const [currentDistrict, setCurrentDistrict] = useState<DistrictName | string>('City Center');
  const [totalMeters, setTotalMeters] = useState(120);

  const [player, setPlayer] = useState({
    id: 1,
    username: 'Trainer_Ash',
    level: 3,
    xp: 450,
    coins: 650,
    avatar_skin: '#fbcfe8',
    avatar_hair: '#1e293b',
    avatar_shirt: '#2563eb',
    avatar_pants: '#1e293b'
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
  };

  const handleDpad = (dir: { x: number; y: number }) => {
    dpadEarthRef.current = dir;
    // Dispatch synthetic key events so IsoEarth picks up D-pad
    const map: Record<string, string> = {
      '0,-1': 'ArrowUp',
      '0,1': 'ArrowDown',
      '-1,0': 'ArrowLeft',
      '1,0': 'ArrowRight'
    };
    const key = map[`${dir.x},${dir.y}`];
    if (key) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
    } else {
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(code =>
        window.dispatchEvent(new KeyboardEvent('keyup', { code }))
      );
    }
  };

  const onDistrictChange = (realm: DistrictRealm) => {
    const labels: Record<DistrictRealm, string> = {
      city_center: 'City Center',
      residential: 'Residential District',
      central_park: 'Central Park',
      pixel_harbor: 'Pixel Harbor',
      shopping_outpost: 'Shopping Outpost',
      tournament_arena: 'Tournament Arena',
      mixed: 'Mixed Earth'
    };
    setCurrentDistrict(labels[realm]);
  };

  const avatar = {
    username: player.username,
    skin: player.avatar_skin,
    hair: player.avatar_hair,
    shirt: player.avatar_shirt,
    pants: player.avatar_pants
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden font-sans">
      <DexMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        player={player}
        isOutdoorMode={isOutdoorMode}
        currentDistrict={String(currentDistrict)}
      />

      <div className="relative flex-1 w-full h-full overflow-hidden">
        <IsoEarthView
          avatar={avatar}
          visible={activeTab === 'PLAY'}
          onDistrictChange={onDistrictChange}
        />

        {activeTab === 'PLAY' && (
          <div className="absolute bottom-8 left-8 z-30 flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
            <button
              onMouseDown={() => handleDpad({ x: 0, y: -1 })}
              onMouseUp={() => handleDpad({ x: 0, y: 0 })}
              onTouchStart={() => handleDpad({ x: 0, y: -1 })}
              onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
              className="p-3 rounded-xl glass-panel border border-slate-700 text-white active:bg-amber-500 active:text-slate-950 shadow-lg"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <button
                onMouseDown={() => handleDpad({ x: -1, y: 0 })}
                onMouseUp={() => handleDpad({ x: 0, y: 0 })}
                onTouchStart={() => handleDpad({ x: -1, y: 0 })}
                onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
                className="p-3 rounded-xl glass-panel border border-slate-700 text-white active:bg-amber-500 active:text-slate-950 shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onMouseDown={() => handleDpad({ x: 1, y: 0 })}
                onMouseUp={() => handleDpad({ x: 0, y: 0 })}
                onTouchStart={() => handleDpad({ x: 1, y: 0 })}
                onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
                className="p-3 rounded-xl glass-panel border border-slate-700 text-white active:bg-amber-500 active:text-slate-950 shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <button
              onMouseDown={() => handleDpad({ x: 0, y: 1 })}
              onMouseUp={() => handleDpad({ x: 0, y: 0 })}
              onTouchStart={() => handleDpad({ x: 0, y: 1 })}
              onTouchEnd={() => handleDpad({ x: 0, y: 0 })}
              className="p-3 rounded-xl glass-panel border border-slate-700 text-white active:bg-amber-500 active:text-slate-950 shadow-lg"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <p className="text-[9px] text-slate-400 font-orbitron mt-1 tracking-wider">
              {totalMeters}m walked
            </p>
          </div>
        )}

        {activeTab === 'CARDS' && (
          <div className="w-full h-full p-6 overflow-y-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-extrabold font-orbitron text-amber-400">
                EMOJI DESIGN FISH CARDS
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Collectible holographic cards framed like fishcard.svg — emoji faces, tournament loot, IsoEarth drops.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {cards.map(c => (
                <FishCardView
                  key={c.id}
                  card={c}
                  onUpgrade={handleUpgradeCard}
                  playerCoins={player.coins}
                />
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

        {activeTab === 'AVATAR' && (
          <AvatarCustomizer avatar={avatar} onSaveAvatar={handleSaveAvatar} />
        )}

        {activeTab === 'FRIENDS' && (
          <FriendsScreen
            nearbyPlayers={nearbyPlayers}
            onAddFriend={username => alert(`Friend request sent to ${username}!`)}
          />
        )}
      </div>
    </div>
  );
};
