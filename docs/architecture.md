# Architecture

## Scope

Conquest Tracker is a static, local-first browser app for tracking a live conquest-style strategy board game. It records the board state, guides each phase of play, and provides optional probability context.

The tracker does not roll dice, automate turns, or modify the board unless the user records an action.

## Runtime

- Static HTML, CSS, and native JavaScript modules.
- No framework, backend, package install, build step, or remote API.
- Compatible with GitHub Pages.
- Game state and undo history are stored in browser `localStorage`.

## State model

```js
{
  version: 3,
  phase: 'setup' | 'claim' | 'stack' | 'ready' | 'reinforce' | 'attack' | 'fortify' | 'gameOver',
  players: [
    { id, name, color, placedTroops, eliminated }
  ],
  activePlayerIndex: 0,
  startingTroops: 35,
  reinforcementPool: 0,
  turnNumber: 1,
  winnerId: null,
  territories: {
    alaska: { ownerId: 'player-1', troops: 4 }
  },
  history: [
    { message, time }
  ],
  undoStack: [],
  updatedAt: null
}
```

Territory totals, continent control, reinforcement amounts, and player totals are derived from the board state.

## Game flow

```text
setup → claim → stack → ready
                         ↓
              reinforce → attack → fortify
                  ↑                    ↓
                  └──── next turn ─────┘
```

## Map model

`src/map-data.js` defines six continents, 42 territories, SVG coordinates, adjacency, and bridge edges. The map uses original abstract shapes for grouping and does not rely on official board artwork.

## Probability model

`src/probability.js` computes exact true-random battle distributions from dice outcomes. `src/strategy.js` estimates best reachable routes from the active player's current stacks.

For each route, the engine evaluates the next battle, estimates survivor counts, and continues along enemy-only paths up to a limited depth. Direct battle odds are exact for the supported true-random model. Multi-battle route odds are planning estimates.

## Persistence

The app saves meaningful board changes to `localStorage` under the current state key. Older setup-only saves are migrated when possible.

Undo stores the previous 30 snapshots without recursively storing nested undo history.
