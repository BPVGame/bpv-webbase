# BPV Game — iOS Foundation (SpriteKit)

Swift sources for the native client. Pair with Tiled maps in `Resources/Maps/` and the shared API at **https://bpvgame.com**.

## Stack

- **SpriteKit** — 16-bit isometric / top-down scene (`GameScene`)
- **Tiled Map Editor** — author `.tmj` maps; load via `TiledMapLoader`
- **Core Location** — Outdoor Mode (`LocationManager`)
- **URLSession** — `BpvApiClient` → bpvgame.com

## Quick start (Xcode)

1. Create an iOS App (SpriteKit Game) named `BPVGame`.
2. Add all files under `Sources/` to the target.
3. Copy `Resources/Maps/city-center.tmj` into the app bundle.
4. Enable **Location When In Use** in Info.plist (`NSLocationWhenInUseUsageDescription`).
5. Present `GameScene` from the default `GameViewController` / SwiftUI `SpriteView`.

## Shared contracts

Tile IDs, Tiled GID map, and REST paths mirror the web client — see `docs/ARCHITECTURE.md`.
