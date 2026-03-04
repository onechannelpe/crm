---
description: "Use when writing, reviewing, or refactoring Rust code in apps/engine or apps/pipeline. Covers error handling, validation ordering, and contract conventions."
applyTo: "**/*.rs"
---
# Rust conventions

## Error handling

- Use `Result<T, E>` throughout. Propagate with `?`—never ignore errors.
- Validate inputs early in handlers; keep the happy path as straight-line code.
- Fail-fast ordering: validate inputs → auth checks → business logic.

## Project structure

- Engine: `apps/engine/` — HTTP API, domain logic, SQLite storage
- Pipeline: `apps/pipeline/` — data ingestion pipeline

## Contract workflow

- `contracts/engine-api.json` is the source of truth.
- Run `bun run generate:engine-contract` after any contract change.
- Never edit generated binding files.

## Checks

Run `bun run check:engine` after every change before proposing.
