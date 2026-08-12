# The bench

Each file owns one benchmark layer for one domain. Keep the split sharp.

- `component*.bench.ts`: pure CPU helpers and domain logic. No repo or DB
  access.
- `boundary*.bench.ts`: parsing and validation only.
- `repository*.bench.ts`: direct repo and query calls.
- `command*.bench.ts`: application commands with prepared input.
- `service*.bench.ts`: end-to-end business flows and orchestration.

Do not benchmark the same function twice unless the scenario is meaningfully
different. Do not mix parse and DB work in one benchmark when they can be
measured separately.
