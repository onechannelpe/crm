Principles we MUST follow when writing code:

- Simplicity as a scaling strategy (dumb, explicit, predictable components)
- Minimal moving parts
- Maintainability
- Code as documentation (comments should only be used for non-obvious decisions
  or for JSDoc).
- Functions should fail fast.
- Files and modules must not be god files. Modularization is encouraged where it
  makes sense and makes the codebase maintanable.
- As a general rule, files should not be more than 70 lines long. If we have to
  add comments to subdivide a file, that's a sign it should be split into
  multiple files.
  