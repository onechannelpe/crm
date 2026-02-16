# Project guidelines

## ALWAYS

- Prefer retrieval-led reasoning over pre-training for libraries/frameworks. Use MCP context7 for current docs before writing code.
- Follow framework conventions—do not invent workarounds.
- Implement ONLY what requested (no extra features, no improvements). If request conflicts with architecture or standards, state concern and suggest alternatives.
- If ambiguous, ask up to 2 clarifying questions OR choose simplest valid interpretation.
- Keep responses brief: 3-6 sentences for typical answers. For multi-step work: short overview + ≤5 bullets (what changed, where, next steps).
- State what you verified vs what you're inferring. If uncertain about line numbers or API details, say so.

## WHEN implementing

- Make one change at a time. Run `bun run check` after each change.
- After edits: briefly state what changed, where (file/lines), and validation performed.
- Parallelize independent tool calls (file reads, searches) when possible.
- Provide brief updates (1-2 sentences) only when starting major work phases or plan changes.
- For complex architectural decisions: propose multiple options, evaluate with a rubric (pros/cons/tradeoffs), choose best or suggest hybrid. For straightforward implementations, proceed directly.
- Apply fail-fast: validate inputs → auth checks → business logic
  - Check "not OK" first to avoid nesting
  - Early return or throw immediately for invalid states
  - Keep happy path as straight-line code at the end
- TypeScript: Result<T,E> for service-layer errors. Check isErr() before throw/return
- Rust: Result<T,E> with ?. Validate early in handlers

## WHEN debugging

1. Reproduce: confirm current behavior
2. Isolate: add logging/breakpoints, narrow failing component
3. Read involved code paths
4. Fix only after understanding root cause

Do not assume bug from error messages alone.

## WHEN adding dependencies

- `bun install <package>` to add packages
- Never manually edit package.json dependency versions
- Look up current API via context7 if unfamiliar

## WHEN writing TypeScript

- Extract types from repo/service returns: `Awaited<ReturnType<typeof repos.foo.bar>>`
- Use utility types: `Pick<T, K>`, `Omit<T, K>`, `Partial<T>` over manual type redefinition
- Use `unknown` for external/untrusted data (errors, JSON parsing, API responses); narrow with type predicates `(value: unknown): value is Type`
- Use `as const` for literal values to enable discriminated unions: `{ status: "ok" as const }`
- Use `satisfies` for validation without widening: configs, `Record<K, V>` dictionaries, template literals
- End union/enum `switch` with `satisfies never` for exhaustiveness checks

## WHEN writing documentation

Prefer sentence case for headings. Avoid emojis.

## STANDARDS—Files

Naming: kebab-case.ts, camelCase vars, PascalCase types, UPPER_SNAKE_CASE constants

Organization: 70-line guideline (not hard rule). Single responsibility—if "and also" in description, split. Code as documentation. Comments only for non-obvious decisions or JSDoc.

## STANDARDS—Project

Monorepo: web (TS/Bun, apps/web/), engine (Rust, apps/engine/), contracts (JSON source, contracts/engine-api.json)

Contract workflow: Changes to contracts/engine-api.json are source of truth. Run `bun run generate:engine-contract` for bindings. Never edit generated files.

Tests: tests/integration/, tests/unit/. Use vitest. Descriptive: `it("blocks further attempts after repeated failures")`

Checks: `bun run check` before proposing. Use `check:web` or `check:engine` for specific subsystems.
