# Project guidelines

## ALWAYS

- Prefer retrieval-led reasoning over pre-training for libraries/frameworks. Use MCP context7 for current docs before writing code.
- Follow framework conventions. Do not invent workarounds.
- Implement ONLY what requested. If the request adds coupling, duplication, special cases, or workaround-driven design, state the concern and propose the cleaner design first.
- If ambiguous, ask up to 2 clarifying questions OR choose simplest valid interpretation.
- Keep responses brief: 3-6 sentences for typical answers. For multi-step work: short overview + ≤5 bullets (what changed, where, next steps).
- State what you verified vs what you're inferring. If uncertain about line numbers or API details, say so.
- Do not use em dashes in comments, logs, docs, commit messages, or user-facing strings.

## WHEN implementing

- Make one change at a time.
- After edits: briefly state what changed, where (file/lines), and validation performed.
- Parallelize independent tool calls (file reads, searches) when possible.
- Provide brief progress updates only when starting major work phases or plan changes.
- For complex architectural decisions: propose multiple options, evaluate with a rubric (pros/cons/tradeoffs), choose best or suggest hybrid. For straightforward implementations, proceed directly.
- Apply fail-fast: validate inputs → auth checks → business logic
  - Check "not OK" first to avoid nesting
  - Early return or throw immediately for invalid states
  - Keep happy path as straight-line code at the end
- For TypeScript services: return `Result<T,E>` and check `isErr()` before throw or return.
- For Rust handlers and services: validate early and propagate failures with `?`.
- Implement the intended design fully. Do not stop at scaffolding, placeholder phases, or partial rewrites.
- After implementation, reread the touched files and confirm the work is complete, coherent, and free of temporary compatibility code, duplicate paths, and partial renames.
- Validate by scope:
  - Docs or instruction changes: reread links, file references, commands, and generated indexes. Do not run full repo checks unless behavior changed.
  - Narrow code changes: run the smallest relevant check while working.
  - Broad refactors or redesigns: finish the design first, then run the relevant checks at the end.
  - Run `bun run check` only for cross-subsystem changes, generation or contract changes, or repo-wide tooling changes.
- Use `bun run test` for Vitest-based tests. Do not use `bun test`.

## WHEN debugging

1. Reproduce: confirm current behavior
2. Isolate: narrow the failing component and list the possible causes
3. Read involved code paths
4. Add logs or checks where they can confirm or reject each possible cause
5. Fix only after understanding root cause
6. After finding the cause, read beyond the local file and decide whether the problem is local, at a boundary, or architectural
7. If the problem is architectural, fix the design instead of patching the symptom

Do not assume bug from error messages alone.
Do not choose the quickest patch before checking whether the surrounding design caused the issue.
For browser-specific issues the agent cannot observe directly, do not guess. Add the needed logs, tell the user what to run, and wait for the resulting console or server logs before fixing.

## WHEN adding dependencies

- `bun install <package>` to add packages
- Never manually edit package.json dependency versions
- Look up current API via context7 if unfamiliar

## WHEN writing TypeScript

1. Read the touched code path and extract types from existing repo or service returns before introducing new types.
2. Validate external or untrusted data at the boundary. Use `unknown` first, then narrow with type predicates.
3. Keep service-layer failures in `Result<T,E>`. Check `isErr()` before throw or return.
4. Use `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, `as const`, and `satisfies` to preserve inference instead of rebuilding shapes manually.
5. End union or enum `switch` statements with `satisfies never`.

Failure points:

- Duplicating a type that can be inferred from an existing function.
- Treating parsed JSON, form data, or caught errors as trusted data.
- Throwing a service-layer failure that should stay in `Result<T,E>`.

## WHEN writing Rust

1. Read the full handler or service path before changing code.
2. Validate inputs and auth first. Keep the happy path straight.
3. Propagate fallible operations with `?` instead of `.unwrap()`.
4. Keep changes in existing modules unless a new logical boundary is required.
5. Use `bun run check:engine` for engine or pipeline changes.

Failure points:

- Nested validation that hides the happy path.
- Silent error drops with `let _ =` on fallible operations.
- Unchecked indexing where `.get()` or iterators fit.

## WHEN writing documentation

Prefer sentence case for headings. Avoid emojis.

## WHEN writing SolidJS

Anti-patterns (check docs before implementing):

- Props destructuring breaks reactivity. Use `props.value`, not `const { value } = props`
- Components run once, not on every update. Signals drive updates
- Signals are functions. Access with `count()`, not `count`
- Use `<For>` (reference-keyed) for objects, `<Index>` (index-keyed) for primitives
- Side effects belong in `createEffect`/`onMount`, never during render

## standards - files

- Naming: kebab-case.ts, camelCase vars, PascalCase types, UPPER_SNAKE_CASE constants
- Organization: 70-line guideline (not hard rule). Single responsibility. If "and also" appears in the description, split. Code as documentation. Comments only for non-obvious decisions or JSDoc.
- Use descriptive test names such as `it("blocks further attempts after repeated failures")`.
