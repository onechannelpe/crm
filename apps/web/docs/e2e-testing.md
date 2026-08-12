# End-to-end testing

The Playwright suite runs a built Culqi360 server against PostgreSQL. It uses
seeded sessions and a log-backed email provider. The search engine is not
started or replaced, so the current suite does not cover engine-backed search.

## Run the suite

Start PostgreSQL, then run from `apps/web`:

```sh
bun run test:e2e
bun run test:e2e:headed
bun run test:e2e:ui
```

The commands load `.env.test`. `WEB_DB_URL` must point to a reachable local
PostgreSQL server.

## Execution model

Playwright global setup runs [`tools/e2e/prepare.ts`](../tools/e2e/prepare.ts).
The script builds the application when needed, creates a seeded template
database, and writes the worker manifest.

Each Playwright worker clones the template database and starts its own built
server. An automatic fixture resets that worker database before every test.
Workers do not share database state.

Upload storage is not isolated by worker. Every server inherits the same
`WEB_UPLOADS_ROOT`, so tests that write files must use unique storage keys or
provide separate cleanup.

## Authentication and external services

[`prepare.ts`](../tools/e2e/prepare.ts) seeds one user for every role. Role
fixtures create browser contexts with the corresponding session cookie; they do
not submit the login UI.

Direct page fixtures are `asExecutive`, `asBackOffice`, `asManager`, `asAdmin`,
and `asSuperuser`. `signInAs(role)` supports every seeded role.

The built server overrides `NOTIFICATION_ROUTES` with `email:log`. Tests inspect
captured messages through `mailbox()`. Engine clients remain the normal HTTP
clients, but the suite does not start an engine process.

## Write a test

Import `test` and `expect` from [`./fixtures`](../tests/e2e/fixtures.ts). Use a
role fixture unless the test is specifically about authentication.

```ts
test("shows the records workspace to an executive", async ({ asExecutive }) => {
  await asExecutive.goto("/records");
  await expect(asExecutive).not.toHaveURL(/\/login/);
});
```

Create state through Culqi360 when testing user behavior. Query
`workerDb.db.client` only for results the UI does not expose. Use `mailbox()`
for email assertions.

## Harness map

| Path                                                | Purpose                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| [`tools/e2e/prepare.ts`](../tools/e2e/prepare.ts)   | Builds Culqi360 and creates the template database.      |
| [`tests/e2e/roster.ts`](../tests/e2e/roster.ts)     | Defines seeded users and sessions.                      |
| [`tests/e2e/manifest.ts`](../tests/e2e/manifest.ts) | Shares prepared paths and reset data with workers.      |
| [`tests/e2e/db.ts`](../tests/e2e/db.ts)             | Clones, resets, and drops worker databases.             |
| [`tests/e2e/server.ts`](../tests/e2e/server.ts)     | Starts one built server per worker.                     |
| [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) | Owns worker lifecycle, authentication, and the mailbox. |
| [`tests/e2e/*.spec.ts`](../tests/e2e/)              | Contains the browser tests.                             |
