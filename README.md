# Checkers

Real-time multiplayer checkers on Starknet. Challenge opponents online, climb the ELO ladder, spectate live games, and have every move recorded on-chain via Dojo Engine.

> *Classic checkers, competitive ranking, permanent blockchain history.*

## Gameplay

Standard 8x8 checkers on 32 dark squares. Red moves first. Pieces capture by jumping diagonally, and multi-jumps chain automatically. Reach the opposite back row to promote a piece to a king — kings move and capture in all four diagonal directions.

Games end by **elimination** (all opponent pieces captured), **stalemate** (opponent has no legal moves), **resignation**, **mutual draw**, or the **40-move rule** (40 consecutive moves with no capture triggers an automatic draw).

## Multiplayer

Three ways to play online:

**Quick Match** — Join the matchmaking queue. The server pairs you with the next available opponent. Games start instantly once matched.

**Private Room** — Create a room and share the 4-character code with a friend. They enter the code to join, and the game begins.

**Spectate** — Browse live games from the spectator list. Watch in real-time with a live move log, player stats, and spectator count. A result overlay shows when the game ends.

All multiplayer games sync in real-time via WebSockets. The server validates moves, tracks game state, and calculates ELO changes at game end. Every game action is also recorded on-chain.

## Rating System

Players start at **1200 ELO**. Wins and losses adjust your rating based on the standard ELO formula — beating a higher-rated player earns more points, losing to a lower-rated player costs more.

| Tier | Rating |
|------|--------|
| Novice | < 1000 |
| Beginner | 1000 - 1199 |
| Intermediate | 1200 - 1399 |
| Advanced | 1400 - 1599 |
| Expert | 1600 - 1799 |
| Master | 1800 - 1999 |
| Grandmaster | 2000+ |

Your tier badge and color appear next to your name everywhere — in-game, on the leaderboard, and when spectators watch your match.

## Draw & Resign

**Offering a draw** requires a two-step confirmation to prevent accidental clicks. Once sent, a pending indicator shows until the opponent responds. The opponent sees a prominent bar with Accept/Decline buttons.

**Resigning** also asks for confirmation before submitting. Both actions are recorded on-chain.

## Spectating

The spectate screen mirrors the full game layout:

- Desktop shows player cards in the left sidebar with W/L/D records, a live move log in the right sidebar, and the board in the center
- Mobile stacks player strips above and below the board with a scrollable move log at the bottom
- Spectator count and eye icon in the header
- When the game ends, a result overlay shows the winner and both players' ELO changes

## Leaderboard

Global rankings pulled from the server. Top 50 players shown with:

- Username, rating, tier badge
- Win/loss/draw record and total games played
- Your position highlighted if you're ranked

## Themes

Four visual themes, switchable from Settings:

- **Luxe Dark** — Deep navy with gold accents
- **Clean Modern** — Soft grays, minimal aesthetic
- **Neon Retro** — Vibrant neon on dark backgrounds
- **Warm Wood** — Wooden board with classic tones

Theme preference persists in local storage and applies globally.

## On-Chain Architecture

Built on **Starknet** using the **Dojo Engine** framework. Every game is optionally recorded on-chain with full move history.

### Deployed (Sepolia)

| | Address |
|---|---------|
| **World** | `0x6793da927c86a970cf10d26c49482f6030968f0f4f0bb22ccfbbfcfccdcc49a` |
| **Actions Contract** | `0x7c1fe695f7076b398168d91b3143ab63280fc2dc09947e93fbfb668742fda3` |

### Data Models

**Player** — Wallet address, username, rating, wins, losses, draws, games played.

**Game** — Both players' addresses, current turn, status (waiting/playing/finished), result, move count, captures, draw offers, game mode.

**BoardState** — Two `u128` values encoding the full 32-square board using 4-bit nibbles per square (0=empty, 1=red, 2=black, 3=red king, 4=black king).

### Contract Functions

```
register_player(username)     Register with a username
create_game(mode)             Create a new game (local or online)
join_game(game_id)            Join a waiting game
make_move(game_id, from, to)  Execute a move
resign(game_id)               Resign from a game
offer_draw(game_id)           Offer a draw
accept_draw(game_id)          Accept a draw offer
decline_draw(game_id)         Decline a draw offer
```

Read-only views: `get_player`, `get_game`, `get_board`, `get_square`, `get_player_count`, `get_player_address`.

### Wallet Integration

Uses **Cartridge Controller** for account abstraction. Session keys are configured so players can make moves, resign, and offer draws without signing every transaction manually.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.6, Vite 6, Tailwind CSS 4 |
| State | Zustand 5 |
| Real-time | Socket.IO 4.7 (client + Express server) |
| Blockchain | Starknet Sepolia, Dojo Engine 1.8, Cairo 2.13 |
| Wallet | Cartridge Controller (account abstraction) |
| Indexer | Torii 1.8 |

### Install as App

Checkers is a Progressive Web App. On mobile, tap "Add to Home Screen" from your browser. On desktop Chrome/Edge, click the install icon in the address bar. The app caches assets for fast loading, works offline for the UI shell, and auto-updates when new versions deploy.

## Project Structure

```
checkers/
├── contract/                  # Cairo smart contracts (Dojo Engine)
│   ├── src/
│   │   ├── models.cairo             # Player, Game, BoardState models
│   │   ├── systems/
│   │   │   └── actions.cairo        # Game logic, move validation, ELO
│   │   └── tests/
│   │       └── test_world.cairo     # Contract tests
│   ├── Scarb.toml
│   └── dojo_sepolia.toml
│
├── server/                    # Multiplayer backend
│   ├── src/
│   │   ├── index.ts                 # Express + Socket.IO server
│   │   ├── game/
│   │   │   ├── CheckersGame.ts      # Move validation & game state
│   │   │   ├── Board.ts             # Board representation & helpers
│   │   │   └── EloRating.ts         # ELO calculation
│   │   ├── rooms/
│   │   │   └── RoomManager.ts       # Room lifecycle & matchmaking
│   │   └── types.ts                 # Shared type definitions
│   └── package.json
│
└── frontend/                  # React web app
    ├── src/
    │   ├── screens/                 # 7 screens (game, menu, spectate, leaderboard...)
    │   ├── components/              # 11 UI components (board, pieces, move log...)
    │   ├── hooks/                   # useSocket, useGameState, useContract
    │   ├── store/                   # Zustand game store
    │   ├── dojo/                    # Starknet/Dojo bindings & provider
    │   ├── themes/                  # 4 theme definitions
    │   ├── engine/                  # Sound manager
    │   └── utils/                   # Board logic, constants, contract bridge
    ├── public/                      # PWA assets (manifest, icons, service worker)
    └── package.json
```

## Running Locally

### Prerequisites
- Node.js 18+
- [Dojo toolchain](https://book.dojoengine.org/getting-started) (`sozo`, `katana`, `torii`)

### Contract
```bash
cd contract
sozo build
sozo test
katana                # separate terminal — local chain
sozo migrate          # deploy to local katana
torii                 # separate terminal — indexer
```

### Server
```bash
cd server
npm install
npm run dev           # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # starts on port 5174
```

### Environment Variables (Frontend `.env`)
```
VITE_PUBLIC_DEPLOY_TYPE=localhost
VITE_PUBLIC_NODE_URL=http://localhost:5050
VITE_PUBLIC_TORII=http://localhost:8080
```

### Deploying to Sepolia
```bash
cd contract
./deploy-sepolia.sh
```
Update `frontend/src/dojo/manifest.json` with the new contract addresses from migration output. Set `VITE_PUBLIC_DEPLOY_TYPE=sepolia` in the frontend `.env`.

## Game Rules Reference

- 8x8 board, 12 pieces per side, dark squares only
- Red always moves first
- Men move one square diagonally forward
- Kings move one square in any diagonal direction
- Captures are mandatory when available
- Multi-jump chains execute in sequence
- Promotion happens when a man reaches the opponent's back row
- 40 moves without a capture ends the game in a draw
