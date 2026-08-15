import React, { useEffect, useRef, useState } from 'react';
import { PixelEngine } from './game/PixelEngine';
import { LocationService, DistrictName } from './game/LocationService';
import { DexMenu, DexTab } from './components/DexMenu';
import { FishCardView, FishCardData } from './components/FishCardView';
import { TournamentScreen, TournamentData } from './components/TournamentScreen';
import { MissionsScreen, MissionData } from './components/MissionsScreen';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { FriendsScreen, NearbyPlayer } from './components/FriendsScreen';
import { retroAudio } from './game/AudioSynth';
import { Play, Sparkles, Navigation, Layers, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const locationServiceRef = useRef<LocationService | null>(null);

  // App State
  const [activeTab, setActiveTab] = useState<DexTab>('PLAY');
  const [isOutdoorMode, setIsOutdoorMode] = useState<boolean>(false);
  const [currentDistrict, setCurrentDistrict] = useState<DistrictName>('City Center');
  const [totalMeters, setTotalMeters] = useState<number>(120);

  // Auth & Player Data
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

  // Cards, Tournaments, Missions, Friends Data
  const [cards, setCards] = useState<FishCardData[]>([
    {
      id: 101,
      card_slug: 'neon_guppy',
      name: 'Neon Pixel Guppy',
      rarity: 'Common',
      level: 2,
      attack: 25,
      defense: 18,
      speed: 35,
      description: 'A swift pixelated freshwater guppy glowing in cyan neon.'
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
      description: 'Aggressive robotic bass with laser fins and armored scales.'
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
      description: 'Legendary river runner glowing with plasma energy.'
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
      description: 'Deep sea mythic organism capable of warping space.'
    }
  ]);

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

  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([
    { id: 2, username: 'PixelMaster_99', level: 5, avatar_skin: '#fed7aa', avatar_shirt: '#dc2626' },
    { id: 3, username: 'AquaRider', level: 4, avatar_skin: '#fbcfe8', avatar_shirt: '#10b981' },
    { id: 4, username: 'CyberFisher', level: 7, avatar_skin: '#78350f', avatar_shirt: '#7c3aed' }
  ]);

  // Init Engine & Location
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // top menu height

    const engine = new PixelEngine(canvas);
    engineRef.current = engine;
    engine.setAvatar({
      username: player.username,
      skin: player.avatar_skin,
      hair: player.avatar_hair,
      shirt: player.avatar_shirt,
      pants: player.avatar_pants
    });
    engine.start();

    const locService = new LocationService();
    locationServiceRef.current = locService;
    locService.startTracking((coords, district, meters) => {
      setIsOutdoorMode(locService.isOutdoorMode);
      setCurrentDistrict(district);
      setTotalMeters(Math.floor(meters));

      // Progress walking mission
      setMissions(prev =>
        prev.map(m => (m.mission_key === 'walk_500m' ? { ...m, progress: Math.min(m.target, Math.floor(meters)) } : m))
      );
    });

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
      locService.stopTracking();
    };
  }, []);

  // Card Upgrade Action
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

  // Claim Mission Action
  const handleClaimMission = (missionId: number) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.is_completed) return;

    retroAudio.playQuestComplete();
    setPlayer(p => ({ ...p, coins: p.coins + mission.reward_coins, xp: p.xp + mission.reward_xp }));
    setMissions(prev => prev.map(m => (m.id === missionId ? { ...m, is_completed: true } : m)));
  };

  // Create Tournament Action
  const handleCreateTournament = (name: string, description: string, maxPlayers: number, prize: string) => {
    retroAudio.playClick();
    const newT: TournamentData = {
      id: Date.now(),
      name,
      description,
      max_players: maxPlayers,
      current_players: 1,
      status: 'open',
      prize_description: prize,
      start_time: 'Starting Soon'
    };
    setTournaments([newT, ...tournaments]);
  };

  const handleSaveAvatar = (newAvatar: any) => {
    retroAudio.playItemPickup();
    setPlayer(p => ({ ...p, ...newAvatar }));
    if (engineRef.current) {
      engineRef.current.setAvatar(newAvatar);
    }
  };

  // Virtual Joystick D-Pad Handler for Indoor / Touch Controls
  const handleDpad = (dir: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.joystickDir = dir;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden font-sans">
      {/* Top Dex Bar */}
      <DexMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        player={player}
        isOutdoorMode={isOutdoorMode}
        currentDistrict={currentDistrict}
      />

      {/* Main Content Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* 1. Canvas 2D World (Visible when PLAY tab active) */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${activeTab === 'PLAY' ? 'block' : 'hidden'}`}
        />

        {/* Indoor Virtual Joystick Overlay (For Touch / Mouse D-Pad) */}
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
          </div>
        )}

        {/* NPC Dialogue Box Overlay */}
        {activeTab === 'PLAY' && engineRef.current?.activeDialogue && (
          <div className="absolute bottom-8 right-8 left-48 z-40 p-4 rounded-2xl glass-panel-accent border border-amber-500/50 text-white font-orbitron shadow-2xl animate-fade-in">
            <p className="text-sm font-semibold text-amber-300">
              {engineRef.current.activeDialogue}
            </p>
            <span className="text-[10px] text-slate-400 mt-2 block">
              Press [E] or Space to close.
            </span>
          </div>
        )}

        {/* 2. FISH CARDS COLLECTION View */}
        {activeTab === 'CARDS' && (
          <div className="w-full h-full p-6 overflow-y-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-extrabold font-orbitron text-amber-400">
                FISH CARDS COLLECTION
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Collect, upgrade, and deck-build rare Fish Cards earned from tournaments and exploration.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-6">
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

        {/* 3. TOURNAMENTS View */}
        {activeTab === 'TOURNAMENTS' && (
          <TournamentScreen
            tournaments={tournaments}
            onCreateTournament={handleCreateTournament}
            onJoinTournament={id => alert(`Joined Tournament #${id}!`)}
          />
        )}

        {/* 4. MISSIONS View */}
        {activeTab === 'MISSIONS' && (
          <MissionsScreen missions={missions} onClaimReward={handleClaimMission} />
        )}

        {/* 5. AVATAR Customizer View */}
        {activeTab === 'AVATAR' && (
          <AvatarCustomizer
            avatar={{
              username: player.username,
              skin: player.avatar_skin,
              hair: player.avatar_hair,
              shirt: player.avatar_shirt,
              pants: player.avatar_pants
            }}
            onSaveAvatar={handleSaveAvatar}
          />
        )}

        {/* 6. FRIENDS View */}
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
