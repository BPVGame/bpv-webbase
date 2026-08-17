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

## Emoji Design Fish Cards

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

## Multiplayer

Foundation presence via REST heartbeat (`MultiplayerSync`). Scale path: Redis presence + WebSocket rooms per district.

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
