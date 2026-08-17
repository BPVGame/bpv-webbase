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
import { gameGate } from './game/gate/GameGate';
import { GameServerInfo, SavedServer } from './game/gate/types';
import { onlineGate, savedToInfo } from './net/OnlineGate';
import { MainMenu } from './components/menu/MainMenu';
import { GateChooser } from './components/menu/GateChooser';
import { OfflineLoad } from './components/menu/OfflineLoad';
import { LoginPanel } from './components/menu/LoginPanel';
import { MultiplayerMenu } from './components/menu/MultiplayerMenu';
import { ServerBrowser } from './components/menu/ServerBrowser';
import { AddServerForm } from './components/menu/AddServerForm';
import { DirectConnectForm } from './components/menu/DirectConnectForm';
import { CreateServerForm } from './components/menu/CreateServerForm';
import { ConnectingOverlay } from './components/menu/ConnectingOverlay';
import { ConnectionLost } from './components/menu/ConnectionLost';
import { SettingsPopup } from './components/settings/SettingsPopup';
import { ServerAdminPopup } from './components/admin/ServerAdminPopup';
import { SocialPopup } from './components/social/SocialPopup';
import { bpvApi } from './api/BpvApiClient';

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
  const [, setGateTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [socialKind, setSocialKind] = useState<'friends' | 'party' | 'guild' | null>(null);
  const gate = gameGate.snapshot();

  useEffect(() => {
    const unsub = gameGate.subscribe(() => setGateTick(n => n + 1));
    gameGate.boot();
    retroAudio.startMenuTheme();
    return () => {
      unsub();
      retroAudio.stopMenuTheme();
    };
  }, []);

  useEffect(() => {
    retroAudio.setMuted(gate.settings.mute);
  }, [gate.settings.mute]);

  useEffect(() => {
    if (gate.phase === 'main_menu') retroAudio.startMenuTheme();
    else retroAudio.stopMenuTheme();
  }, [gate.phase]);

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
        if (gameGate.phase !== 'playing') return;
        if (activeTab !== 'PLAY') {
          setActiveTab('PLAY');
        } else {
          setMenuOpen(m => !m);
          setInventoryOpen(false);
        }
      }
      if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        if (gameGate.phase === 'playing' && activeTab === 'PLAY' && !menuOpen) setInventoryOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, menuOpen]);

  const handleUpgradeCard = async (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const cost = card.level * 100;
    if (gate.mode === 'online') {
      const r: any = await onlineGate.action('spend_coins', { amount: cost });
      if (!r.ok || !r.session) return;
      gameGate.patchCharacter({ coins: r.session.coins });
    } else {
      const coins = livePlayer.coins;
      if (coins < cost) return;
      gameGate.persistOffline({ coins: coins - cost });
    }
    retroAudio.playItemPickup();
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? { ...c, level: c.level + 1, attack: c.attack + 12, defense: c.defense + 10, speed: c.speed + 8 }
          : c
      )
    );
  };

  const handleClaimMission = async (missionId: number) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.is_completed) return;
    if (gate.mode === 'online') {
      const r: any = await onlineGate.action('complete_quest', { questId: mission.mission_key });
      if (!r.ok || !r.session) return;
      gameGate.patchCharacter({ coins: r.session.coins, xp: r.session.xp, level: r.session.level });
    } else {
      gameGate.persistOffline({
        coins: livePlayer.coins + mission.reward_coins,
        xp: livePlayer.xp + mission.reward_xp
      });
    }
    retroAudio.playQuestComplete();
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

  const playingWorld = gate.phase === 'playing' && activeTab === 'PLAY';
  const inShell = gate.phase !== 'exited';
  const netMode = playingWorld ? (gate.mode === 'online' ? 'online' : 'offline') : 'preview';

  const livePlayer = {
    ...player,
    username:
      gate.mode === 'online' ? gate.character?.username ?? player.username : gate.offlineProfile?.username ?? player.username,
    coins: gate.mode === 'online' ? gate.character?.coins ?? player.coins : gate.offlineProfile?.coins ?? player.coins,
    level: gate.mode === 'online' ? gate.character?.level ?? player.level : gate.offlineProfile?.level ?? player.level,
    xp: gate.mode === 'online' ? gate.character?.xp ?? player.xp : gate.offlineProfile?.xp ?? player.xp,
    avatar_skin: gate.character?.avatar_skin ?? gate.offlineProfile?.avatar_skin ?? player.avatar_skin,
    avatar_hair: gate.character?.avatar_hair ?? gate.offlineProfile?.avatar_hair ?? player.avatar_hair,
    avatar_shirt: gate.character?.avatar_shirt ?? gate.offlineProfile?.avatar_shirt ?? player.avatar_shirt,
    avatar_pants: gate.character?.avatar_pants ?? gate.offlineProfile?.avatar_pants ?? player.avatar_pants
  };

  const avatar = {
    username: livePlayer.username,
    skin: livePlayer.avatar_skin,
    hair: livePlayer.avatar_hair,
    shirt: livePlayer.avatar_shirt,
    pants: livePlayer.avatar_pants
  };

  const refreshServers = async () => {
    const discovered = await onlineGate.discover();
    const saved = gate.savedServers.map(s => savedToInfo(s, { status: 'unknown' }));
    const merged = [...discovered];
    for (const s of saved) {
      if (!merged.some(m => m.address === s.address && m.port === s.port)) merged.push(s);
    }
    const pinged = await Promise.all(merged.map(s => onlineGate.pingServer(s)));
    gameGate.setDirectory(pinged);
  };

  const connectTo = async (server: GameServerInfo, password?: string) => {
    gameGate.selectServer(server);
    gameGate.beginConnect(server);
    const result = await onlineGate.connect(server, {
      username: livePlayer.username,
      token: bpvApi.token,
      password,
      avatar: { skin: avatar.skin, hair: avatar.hair, shirt: avatar.shirt, pants: avatar.pants },
      onStep: i => gameGate.advanceConnect(i)
    });
    if (result.ok) gameGate.finishConnect(result.character, result.pingMs);
    else gameGate.failConnect(result.reason);
  };

  useEffect(() => {
    if (gate.phase === 'server_select') void refreshServers();
  }, [gate.phase]);

  useEffect(() => {
    if (!playingWorld || gate.mode !== 'online') return;
    const id = setInterval(() => {
      const pose = earthRef.current?.getPose();
      if (pose && onlineGate.sessionId) {
        void onlineGate.action('move', { ...pose, district: realm });
        void onlineGate.snapshot().then(snap => {
          if (!snap && onlineGate.lostConnection()) {
            gameGate.failConnect('Connection lost');
          }
        });
      }
    }, 800);
    return () => clearInterval(id);
  }, [playingWorld, gate.mode, realm]);

  const reconnectAttempt = useRef(0);
  useEffect(() => {
    if (gate.phase !== 'connection_lost' || !gate.settings.autoReconnect || !gate.selectedServer) return;
    if (reconnectAttempt.current >= 2) return;
    reconnectAttempt.current += 1;
    const t = setTimeout(() => {
      if (gate.selectedServer) void connectTo(gate.selectedServer);
    }, 1600);
    return () => clearTimeout(t);
  }, [gate.phase]);

  useEffect(() => {
    if (gate.phase === 'playing') reconnectAttempt.current = 0;
  }, [gate.phase]);

  const playing = playingWorld;

  return (
    <div className="game-root">
      {inShell ? (
        <IsoEarthView
          ref={earthRef}
          avatar={avatar}
          visible
          netMode={netMode}
          interactive={playingWorld}
          onDistrictChange={onDistrictChange}
          onNpcTalked={onNpcTalked}
        />
      ) : null}

      {gate.phase === 'main_menu' ? (
        <MainMenu
          hasSave={gate.hasLocalSave}
          onPlay={() => gameGate.openGate()}
          onOnline={() => gameGate.chooseOnline()}
          onOffline={() => gameGate.chooseOffline()}
          onServers={() => gameGate.openMultiplayer()}
          onSettings={() => setSettingsOpen(true)}
          onExit={() => gameGate.exitGame()}
        />
      ) : null}

      <GateChooser
        open={gate.phase === 'gate'}
        onOffline={() => gameGate.chooseOffline()}
        onOnline={() => gameGate.chooseOnline()}
        onServers={() => gameGate.openMultiplayer()}
        onBack={() => gameGate.boot()}
      />
      <OfflineLoad
        open={gate.phase === 'offline_load'}
        onEnter={() => {
          gameGate.persistOffline({
            username: player.username,
            coins: player.coins,
            level: player.level,
            xp: player.xp,
            avatar_skin: player.avatar_skin,
            avatar_hair: player.avatar_hair,
            avatar_shirt: player.avatar_shirt,
            avatar_pants: player.avatar_pants
          });
          gameGate.confirmOfflineWorld();
        }}
        onBack={() => gameGate.boot()}
      />
      <LoginPanel
        open={gate.phase === 'auth'}
        defaultName={player.username}
        onBack={() => gameGate.boot()}
        onSkip={() => gameGate.openServerSelect()}
        onAuthed={(token, username) => {
          gameGate.authenticated(token || 'guest', {
            id: username,
            username,
            level: player.level,
            xp: player.xp,
            coins: player.coins,
            avatar_skin: player.avatar_skin,
            avatar_hair: player.avatar_hair,
            avatar_shirt: player.avatar_shirt,
            avatar_pants: player.avatar_pants,
            col: 0,
            row: 0,
            district: 'city_center',
            role: 'player',
            reputation: 50
          });
        }}
      />
      <MultiplayerMenu
        open={gate.phase === 'multiplayer_menu'}
        onJoin={() => {
          gameGate.openServerSelect();
          void refreshServers();
        }}
        onCreate={() => gameGate.openCreateServer()}
        onMine={() => gameGate.openServerSelect()}
        onDirect={() => gameGate.openDirectConnect()}
        onBack={() => gameGate.boot()}
      />
      <ServerBrowser
        open={gate.phase === 'server_select'}
        servers={gate.directory}
        selectedId={gate.selectedServer?.id}
        onRefresh={() => void refreshServers()}
        onSelect={s => gameGate.selectServer(s)}
        onJoin={() => gate.selectedServer && void connectTo(gate.selectedServer)}
        onAdd={() => gameGate.openAddServer()}
        onDirect={() => gameGate.openDirectConnect()}
        onCreate={() => gameGate.openCreateServer()}
        onBack={() => gameGate.openMultiplayer()}
      />
      <AddServerForm
        open={gate.phase === 'add_server'}
        onBack={() => gameGate.openServerSelect()}
        onSave={(s: SavedServer) => {
          gameGate.addSavedServer(s);
          gameGate.openServerSelect();
          void refreshServers();
        }}
      />
      <DirectConnectForm
        open={gate.phase === 'direct_connect'}
        onBack={() => gameGate.openServerSelect()}
        onConnect={(address, port, password) => {
          void connectTo(
            {
              id: `direct_${address}_${port}`,
              name: `${address}:${port}`,
              address,
              port,
              protocol: 'http',
              kind: 'direct',
              players: 0,
              maxPlayers: 50,
              pingMs: null,
              status: 'unknown',
              passwordProtected: Boolean(password),
              pvp: false,
              pve: true,
              npcAi: true
            },
            password
          );
        }}
      />
      <CreateServerForm
        open={gate.phase === 'create_server'}
        onBack={() => gameGate.openMultiplayer()}
        onCreated={(name, address, port, password) => {
          gameGate.addSavedServer({
            id: `host_${address}_${port}`,
            name,
            address,
            port,
            protocol: 'http',
            password,
            kind: 'self_hosted'
          });
          gameGate.openServerSelect();
          void refreshServers();
        }}
      />
      <ConnectingOverlay
        progress={
          ['connect', 'load_player', 'load_world', 'sync'].includes(gate.phase) ? gate.progress : null
        }
        serverName={gate.selectedServer?.name}
      />
      <ConnectionLost
        open={gate.phase === 'connection_lost'}
        failure={gate.failure}
        onRetry={() => gate.selectedServer && void connectTo(gate.selectedServer)}
        onServers={() => gameGate.openServerSelect()}
        onOffline={() => gameGate.chooseOffline()}
        onMenu={() => {
          void onlineGate.leave();
          gameGate.boot();
        }}
      />

      <SettingsPopup
        open={settingsOpen}
        settings={gate.settings}
        mode={gate.mode}
        connected={gate.mode === 'online' && playingWorld}
        pingMs={gate.pingMs}
        serverName={gate.connectedServerName}
        role={gate.role}
        onChange={p => gameGate.applySettings(p)}
        onRequestMode={m => {
          const r = gameGate.requestModeSwitch(m);
          if (!r.ok) return;
          setSettingsOpen(false);
        }}
        onLeaveServer={() => {
          void onlineGate.leave();
          gameGate.leaveServer();
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <ServerAdminPopup open={adminOpen} onClose={() => setAdminOpen(false)} />
      <SocialPopup kind={socialKind} onClose={() => setSocialKind(null)} />

      {gate.phase === 'exited' ? (
        <div className="main-menu">
          <div className="main-menu-card">
            <h1 className="main-menu-logo">BPV</h1>
            <p>Thanks for playing.</p>
            <button type="button" className="main-menu-play" onClick={() => gameGate.boot()}>
              Return
            </button>
          </div>
        </div>
      ) : null}

      {playing && (
        <>
          <GameHUD
            player={livePlayer}
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

          <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} gold={livePlayer.coins} />

          <PauseMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            playerName={livePlayer.username}
            currentRealm={realm}
            online={gate.mode === 'online'}
            canAdmin={gate.role === 'owner' || gate.role === 'admin' || gate.role === 'moderator'}
            onSettings={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
            onMainMenu={() => {
              setMenuOpen(false);
              if (gate.mode === 'online') void onlineGate.leave();
              if (gate.mode === 'offline') {
                gameGate.persistOffline({
                  username: livePlayer.username,
                  coins: livePlayer.coins,
                  level: livePlayer.level,
                  xp: livePlayer.xp
                });
              }
              gameGate.backToMenu();
            }}
            onAdmin={() => {
              setMenuOpen(false);
              setAdminOpen(true);
            }}
            onSocial={k => {
              setMenuOpen(false);
              setSocialKind(k);
            }}
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

      {!playing && gate.phase === 'playing' && (
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
                  <FishCardView key={c.id} card={c} onUpgrade={handleUpgradeCard} playerCoins={livePlayer.coins} />
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
