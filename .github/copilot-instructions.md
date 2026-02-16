# Project guidelines

## If implementing a feature

- Use MCP tools (context7) to fetch current documentation for libraries before writing code
- Follow official docs patterns, not training data assumptions
- Follow framework conventions, do not invent workarounds
- Apply fail-fast pattern: validate inputs → auth checks → business logic
  - Check "not OK" first to avoid nesting
  - Early return or throw immediately for invalid states
  - Keep happy path as straight-line code at the end
- TypeScript: use `Result<T, E>` for service-layer errors. Check with `isErr()` before throwing or returning
- Rust: use `Result<T, E>` with `?` operator. Validate early in handlers

## If fixing a bug

1. Reproduce: confirm current behavior
2. Isolate: add logging/breakpoints, narrow down failing component
3. Read involved code paths
4. Fix only after understanding root cause

Do not assume the bug from error messages alone.

## If adding dependencies

- Use `bun install <package>` to add packages
- Never manually edit package.json dependency versions
- Look up current API usage with MCP tools (context7) when encountering unfamiliar APIs

## If writing TypeScript

Use `satisfies` to enforce contracts without widening inferred types:

- Prefer `satisfies` over type annotations and `as const` for configs when you want validation + autocomplete + narrow inference
- Use `satisfies` to catch key typos and invalid values at declaration site, not call site
- Use `satisfies Record<K, V>` for dictionaries/maps to validate required keys/values while keeping literal specificity per entry
- Use `satisfies` with template-literal types to validate string formats while preserving the literal value
- End union/enum `switch` statements with exhaustiveness check using `satisfies never` so adding a case breaks compilation until handled

## File standards

Naming:
- Files: `kebab-case.ts`, `kebab-case.test.ts`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

Organization:
- Files should not exceed 70 lines (guideline, not hard rule)
- Single responsibility per file. If description includes "and also", split it
- Code as documentation. Use comments only for non-obvious decisions or JSDoc

## Project context

Monorepo: web (TypeScript/Bun at `apps/web/`), engine (Rust at `apps/engine/`), contracts (JSON source of truth at `contracts/engine-api.json`)

Contract workflow: Changes to `contracts/engine-api.json` are source of truth. Run `bun run generate:engine-contract` to generate bindings. Never edit generated files.

Tests: `tests/integration/`, `tests/unit/`. Use vitest. Descriptive names like `it("blocks further attempts after repeated failures")`.

Checks: Run `bun run check` before proposing changes. Use `check:web` or `check:engine` for specific subsystems.
