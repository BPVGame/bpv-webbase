# Living AI NPC System

BPV IsoEarth stays the authoritative game engine (infinite chunks, movement, inventory, economy execution).  
**Neuriy ChatBase + ElloFive** provide cognition (dialogue / unusual decisions) through a **server-side proxy**.

```text
BPV GAME WORLD
      │
WORLD SIMULATION (NpcDirector)
      │
 ┌────┼────┐
 NPC AI  WORLD AI  EVENTS
 └────┼────┘
      ▼
NEURIY CHATBASE / ELLOFIVE   ← via POST /api/npc/ai (secrets server-only)
      ▼
STRUCTURED JSON INTENT
      ▼
GAME TOOL API (validated registry)
      ▼
GAME ENGINE (paths, money, memories, quests)
```

## What was added

| Module | Role |
|--------|------|
| `src/game/npc/types.ts` | Persistent NPC identity model |
| `personality.ts` | Continuous traits → dialogue **and** decisions |
| `memory.ts` | Short/long/relationship/world/personal + retrieval |
| `relationships.ts` | Trust/friendship/respect/fear/anger |
| `worldClock.ts` | Day/time/season/weather + schedules/needs |
| `worldEvents.ts` | Festival, market, weather, crime, … |
| `economy.ts` | Earn/spend/trade + need-based quests |
| `knowledge.ts` | Limited knowledge + rumor spread |
| `simulation/*` | LOD, planner L1–L3, NPC↔NPC, abstract far-sim |
| `ai/*` | Prompts, structured parse, ChatBase client |
| `tools/registry.ts` | Allow-listed game tools only |
| `NpcDirector.ts` | Orchestrator + persistence |
| `server/npc/*` | ElloFive proxy + optional DB snapshots |
| `NpcDialogueOverlay` / `NpcDebugPanel` | Talk UI + F3 debug |

Infinite `WorldGen` / `ChunkWorld` are **unchanged** in behavior; NPCs use world coordinates and LOD so unloaded chunks do not freeze lives (abstract sim continues).

## Controls

- **E / Space** — talk to nearby NPC  
- **F3** — NPC debug panel (force AI, teleport, inspect memory)

## Environment

```bash
# Server (.env)
ELLOFIVE_URL=http://127.0.0.1:3999   # or ChatBase/ElloFive host
ELLOFIVE_MODEL=ellofive
ELLOFIVE_TIMEOUT_MS=12000

# Client (optional; Vite proxies /api → :3001 by default)
VITE_BPV_API_URL=http://127.0.0.1:3001
```

If ElloFive is unreachable, NPCs **fall back to deterministic planner replies** — no freezes.

## Layered AI budget

1. Deterministic simulation (schedules, needs, movement)  
2. Simple rules (hungry → food, storm → shelter)  
3. Planner (flexible schedule / goals)  
4. ElloFive (unusual situations + dialogue) — queued, cooled down, max concurrent  
5. Dialogue generation (structured JSON only)

## Persistence

- Browser: `localStorage` key `bpv_living_npc_v1`  
- Server: `npc_world_state` table + `POST/GET /api/npc/state`

## Tests

```bash
npm run test:npc
```

## Security

- No ElloFive keys in the client  
- Tools must be registered; arguments validated  
- Money / inventory / relationship writes happen in engine code, not free-form model text  
