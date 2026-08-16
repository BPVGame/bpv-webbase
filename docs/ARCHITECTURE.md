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

## IsoEarth

Inspired by isometric world-builders such as [isomiddleearth](https://github.com/hasanharman/isomiddleearth):

- District **realms** (City Center, Pixel Harbor, Central Park, …)
- Grouped tile catalog (Terrain, Water, Trees, Buildings, Decorations)
- JSON map schema + **Tiled Map Editor** export/import (`.tmj`)
- Procedural 16-bit isometric diamonds (shared tile IDs with iOS)

Key files:

- `src/game/iso/IsoEarth.ts` — isometric engine
- `src/game/iso/IsoTiles.ts` — tile catalog
- `src/game/iso/IsoMapData.ts` — map format + generators
- `src/game/iso/TiledMapLoader.ts` — Tiled bridge
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
