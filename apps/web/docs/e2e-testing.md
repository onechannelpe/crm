# End-to-end testing

The Playwright suite runs the built application against a real Postgres
database. Email delivery and the search engine are replaced with test
implementations.

Run the suite from `apps/web` after starting Postgres:

```bash
bun run test:e2e
bun run test:e2e:headed
bun run test:e2e:ui
```

`globalSetup` runs `tools/e2e/prepare.ts`, which verifies Postgres, builds the
application, creates a seeded template database, and writes
`.e2e-manifest.json`. Each Playwright worker clones that template, starts its
own server, and resets its database between tests. Workers never share state.

There is no UI login. `prepare.ts` seeds one user for each role, and fixtures
authenticate by setting the session cookie directly.

```ts
test("...", async ({ asExecutive, asManager }) => {
  // ...
});
```

Available fixtures include `asExecutive`, `asBackOffice`, `asManager`,
`asAdmin`, `asSuperuser`, and `signInAs(role)`.

Email is routed to the `log` provider instead of being sent, so tests can
inspect messages with `mailbox()`. The search engine is not started. Tests that
depend on company search belong in a separate engine-backed suite.

Import `test` and `expect` from `./fixtures`. Prefer role fixtures over logging
in through the UI. Create data through the application instead of inserting
rows directly. For assertions on data the UI does not expose, query the worker
database with `workerDb.db.client` or inspect email with `mailbox()`. Every test
starts from a clean database.

| Path                    | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `tools/e2e/prepare.ts`  | Build the app, create the template database, write the manifest. |
| `tests/e2e/roster.ts`   | Test users.                                                      |
| `tests/e2e/manifest.ts` | Manifest helpers.                                                |
| `tests/e2e/db.ts`       | Clone, reset, and drop databases.                                |
| `tests/e2e/server.ts`   | Start the built server.                                          |
| `tests/e2e/fixtures.ts` | Fixtures, worker lifecycle, mailbox.                             |
| `tests/e2e/*.spec.ts`   | Tests.                                                           |
