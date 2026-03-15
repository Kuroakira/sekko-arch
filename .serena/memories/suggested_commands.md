# Suggested Commands

## Build & Run
- `npm run build` — tsup → dist/ (ESM only)
- `npx sekko-arch scan .` — run CLI scan
- `npx sekko-arch visualize .` — generate HTML report

## Testing
- `npm test` — vitest run (714 tests)
- `npx vitest src/metrics/cycles.test.ts` — single test file
- `npx vitest -t "test name"` — single test by name

## Quality
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — eslint src/
- `npm run format` — prettier --write src/
- `npm run format:check` — prettier --check src/

## System (Darwin)
- `git`, `ls`, `cd`, `grep`, `find` — standard unix commands
