# Style & Conventions

- ESM only (NodeNext module resolution)
- Tests: `*.test.ts` colocated with source files, `describe/it/expect` from vitest (globals: false)
- E2E tests in `src/e2e/` with fixture project at `src/e2e/fixtures/`
- Types use `readonly` arrays and properties for immutability
- No `any` (ESLint enforced), unused params prefixed with `_`
- Constants in UPPER_SNAKE_CASE, types in PascalCase
- Inverted scoring pattern: cohesion and comments use `rawValue = 1 - ratio`
- Git evolution metrics handle `gitHistory === undefined` by returning rawValue=0
- HTML generation bypasses Formatter abstraction
