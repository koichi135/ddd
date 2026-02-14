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
