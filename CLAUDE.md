# CLAUDE.md - Project Guide for Claude Code

## Project Overview
Web-based dungeon crawling game built with React + TypeScript + Vite.

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Test**: Vitest + @testing-library/react
- **Lint**: ESLint (flat config)
- **Format**: Prettier

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Type-check and build for production
- `npm run lint` — Run ESLint
- `npm run format` — Format code with Prettier
- `npm run format:check` — Check formatting without writing
- `npm test` — Run tests once
- `npm run test:watch` — Run tests in watch mode

## Project Structure
```
src/
  main.tsx        — Entry point
  App.tsx         — Root component
  App.css         — App styles
  index.css       — Global styles
  App.test.tsx    — App test
  test/
    setup.ts      — Test setup (jest-dom)
```

## Conventions
- Language: TypeScript strict mode
- Formatting: Prettier (no semicolons, single quotes, trailing commas)
- Components: Function components only (no class components)
- Tests: Place test files next to source files as `*.test.tsx` / `*.test.ts`
- CSS: CSS files co-located with components

## Workflow
1. Make changes
2. Run `npm run lint` to check for issues
3. Run `npm test` to verify tests pass
4. Run `npm run build` to verify the build succeeds

## Game Design

### Map Tiles
| Char | Tile | Description |
|------|------|-------------|
| `#`  | Wall | Solid, non-walkable |
| `.`  | Floor | Empty walkable tile |
| `B`  | Base | Camp spot — can build a camp to rest and restore HP |
| `S`  | Stairs | Descend to next floor |
| `K`  | Boss | Boss spawn point (floor 5 only). Replaced with `S` after defeat |
| `T`  | Treasure Chest | Contains gold and sometimes potions. One-time open per chest |

### Treasure Chests
- Each floor has one treasure chest placed at a fixed position (`T` tile)
- Chests open automatically when the player steps on them
- Rewards: guaranteed gold (`10 + random(0-19) * (floor+1)`) + 50% chance for a potion
- Once opened, the chest stays open (tracked in `openedChests` Set, persisted to DB)
- Opened chests appear dimmer in the 3D view and darker on the minimap
- No random encounters trigger on treasure chest tiles
- Minimap colors: gold (closed), dark gold (opened)
- 3D view: golden glowing box (closed), dim open-lid box (opened)

### Dungeon Floors
- Floors 1–4: Normal floors with base spots, stairs, and treasure chests
- Floor 5 (Boss Floor): Contains boss (`K`) and one treasure chest

### Battle & Encounters
- Random encounter rate: 25% per step on normal floor tiles
- No encounters on base spots (`B`), stairs (`S`), or treasure chests (`T`)
- Boss encounter: immediate upon stepping on `K` tile

### Save System
- SQLite (sql.js) persisted to localStorage
- 3 save slots
- Auto-save on state changes
- Tracks: player stats, items, floor progress, built bases, opened chests, boss status
