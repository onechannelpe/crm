---
description: "Use when writing, reviewing, or refactoring TypeScript or TSX files. Covers type safety patterns, error handling, and naming conventions."
applyTo: "**/*.{ts,tsx}"
---
# TypeScript conventions

## Types

- Extract types from repo/service returns: `Awaited<ReturnType<typeof repos.foo.bar>>`
- Prefer `Pick<T, K>`, `Omit<T, K>`, `Partial<T>` over manually redefining shapes
- Use `unknown` for external/untrusted data (errors, JSON, API responses); narrow with type predicates: `(value: unknown): value is Type`
- Use `as const` for literal values to enable discriminated unions: `{ status: "ok" as const }`
- Use `satisfies` for validation without widening: configs, `Record<K, V>` dictionaries, template literals
- End union/enum `switch` with `satisfies never` for exhaustiveness checks

## Error handling

- Use `Result<T, E>` at the service layer. Always check `isErr()` before throwing or returning.
- Apply fail-fast ordering: validate inputs → auth checks → business logic
  - Check "not OK" first to avoid nesting
  - Early return or throw immediately for invalid states
  - Keep the happy path as straight-line code at the end

## Naming and file conventions

- Files: `kebab-case.ts`
- Variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- 70-line guideline (not a hard limit). If a file description needs "and also", split it.
- Comments only for non-obvious decisions or JSDoc—code is documentation.

## Dependencies

- `bun install <package>` — never manually edit `package.json` version fields
- Look up current API via context7 before writing unfamiliar library code

## Checks

Run `bun run check` (or `bun run check:web`) after every change before proposing.
