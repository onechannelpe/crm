---
name: rust
description: 'Rust implementation standards for this codebase. Use when implementing Rust features, reviewing Rust code, debugging Rust errors, adding modules, or creating new crates. Covers error handling, async patterns, module structure, and naming conventions.'
---

## correctness and clarity
- prioritize code correctness and clarity; speed/efficiency only when explicitly requested
- no organizational/summary comments; comments only for non-obvious "why"
- prefer adding functionality to existing files unless it is a new logical component; avoid creating many small files
- no creative additions unless explicitly requested
- full words for variable names (queue not q, connection not conn)

## error handling
- never use .unwrap(); use ? to propagate errors
- be careful with indexing; prefer iterator methods or .get() to avoid panics
- never silently discard errors with `let _ =` on fallible operations:
  - propagate with ? when caller should handle
  - use .log_err() or similar when ignoring but want visibility
  - use match or if let Err(...) for custom logic
  - avoid `let _ = client.request(..).await?`; just call without binding
- async operations that fail must propagate so callers get meaningful feedback

## module structure
- never mod.rs paths; prefer src/some_module.rs over src/some_module/mod.rs
- new crates: specify library root in Cargo.toml:
  ```toml
  [lib]
  path = "src/my_crate.rs"
  ```

## async clones
use variable shadowing to scope clones, minimize borrow lifetimes:
```rust
executor.spawn({
    let task_ran = task_ran.clone();
    async move {
        *task_ran.borrow_mut() = true;
    }
});
```

## procedure
- read involved code first; understand ownership, lifetimes, error flow
- validate early: inputs → auth → business logic; check "not OK" first; keep happy path straight-line
- scan for .unwrap() and `let _ =` discards; replace with ? or explicit handling
- add to existing file unless genuinely new logical component
- run `bun run check:engine` after each change
