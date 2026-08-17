# BPV Game Architecture Foundation

**Battle Pixel V (BPV)** combines:

> Classic 16-bit RPG + Real-world exploration + Online multiplayer + Tournaments + Collectible Fish Cards

## Technical pillars

| Layer | Web (`bpv-webbase`) | Native iOS |
| --- | --- | --- |
| Rendering | Canvas IsoEarth (`src/game/iso`) | SpriteKit `GameScene` |
| Maps | IsoEarth JSON + Tiled `.tmj` | Tiled Map Editor → `.tmj` in bundle |
| Language | TypeScript / React | Swift |
| Location | Geolocation API `LocationService` | Core Location `LocationManager` |
| Backend | Express + Neon Postgres | same **bpvgame.com** API |

## IsoEarth (infinite)

Chunk-based open world — no finite square boundary:

- `WorldGen.ts` — designed procedural terrain from world `(x, y)`: biome regions, large forests, winding rivers, connected roads, villages & wilderness POIs
- `ChunkWorld.ts` — load/unload `16×16` chunks around the player
- All features are continuous across chunk borders (pure functions of world coords)
- District travel warps to distant origins on the same infinite plane

Key files:

- `src/game/iso/IsoEarth.ts` — isometric engine + camera follow
- `src/game/iso/WorldGen.ts` — infinite designed terrain
- `src/game/iso/ChunkWorld.ts` — chunk streaming
- `src/game/iso/IsoTiles.ts` — tile catalog
- `src/game/iso/TiledMapLoader.ts` — Tiled bridge (authored pockets / POIs)
- `maps/city-center.tmj` — sample Tiled map

## Living AI NPCs

Neuriy ChatBase + ElloFive power NPC cognition; the IsoEarth engine stays authoritative.

- Client: `src/game/npc/` (`NpcDirector`, memory, relationships, LOD simulation, tool registry)
- Server: `server/npc/` (`POST /api/npc/ai` ElloFive proxy, optional state sync)
- UI: talk with **E**, debug with **F3** (`NpcDialogueOverlay`, `NpcDebugPanel`)
- Docs: `docs/LIVING_NPCS.md`

NPCs use world coordinates, continue under chunk unload via abstract simulation, and fall back to deterministic behavior if AI is offline.


Collectible cards framed like `fishcard.svg` (cyan/indigo holographic panels) with emoji faces as artwork.

- Web: `src/components/FishCardView.tsx`
- iOS: `ios/BPVGame/Sources/FishCard.swift`

## API (`https://bpvgame.com`)

Client: `src/api/BpvApiClient.ts` ↔ `ios/BPVGame/Sources/BpvApiClient.swift`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/player` | Profile |
| GET | `/api/player/cards` | Fish card collection |
| POST | `/api/cards/:id/upgrade` | Upgrade card |
| GET/POST | `/api/tournaments` | List / create |
| GET | `/api/missions` | Missions |
| POST | `/api/multiplayer/heartbeat` | IsoEarth presence |

Local server: `server/index.ts` (dev stand-in for bpvgame.com).

## Game Gate & multiplayer

The client no longer boots straight into the world. `GameGate` (`src/game/gate`) runs:

BOOT → MAIN_MENU → OFFLINE (local save) **or** ONLINE (auth → server browser → dedicated shard).

| Piece | Role |
| --- | --- |
| `src/game/gate` | Menu state machine, local profile, settings, saved servers |
| `src/net/OnlineGate.ts` | Official / community / custom / direct connect |
| `server/game` | Authoritative sessions, NPC snapshot, economy, admin roles |
| `server.config.json` | Self-hosted shard name, port, max players, PvP, NPC AI, seed |

Offline never starts `MultiplayerSync`. Online characters and coins live on the server; local saves are not mixed in. Session APIs (`join`, `snapshot`, `action`) target the selected shard (official, community, custom, or direct `host:port`). Snapshots require a valid session. Owner role is granted only to `owner_username` in `server.config.json` (or the first joiner if that field is empty).

APIs: `GET /api/game/directory`, `POST /api/game/session/join`, `GET /api/game/snapshot`, `POST /api/game/action`, `GET /api/game/admin`.

Host: `npm run game-server` (same process as `npm run server`). Listen port comes from `PORT` or `server.config.json` `server_port`.

## Multiplayer

Presence heartbeat remains (`MultiplayerSync`). The dedicated shard is authoritative for movement bounds, coins, XP, quests, kicks/bans, and shared NPC poses. Scale path: Redis presence + WebSocket rooms per district.

## Outdoor mode

GPS meters walked progress missions; district hash maps lat/lng → IsoEarth realm for outdoor sync.

## iOS scaffold

```
ios/BPVGame/
  Sources/
    GameScene.swift          # SpriteKit IsoEarth
    LocationManager.swift    # Core Location
    TiledMapLoader.swift     # Tiled .tmj
    BpvApiClient.swift       # bpvgame.com
    FishCard.swift           # Emoji Design Cards
  Resources/Maps/
    city-center.tmj
```

Open these sources in an Xcode SpriteKit project and add the `.tmj` to the app bundle.
