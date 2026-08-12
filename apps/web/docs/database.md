# Database development

Culqi360 stores application state in PostgreSQL. Development databases are
disposable: schema changes rebuild the database instead of applying a chain of
incremental migrations.

## Initialize PostgreSQL

Run this once from the repository root after cloning the repository:

```sh
bun run dev:infra:setup
```

The command initializes `.pgdata`, starts PostgreSQL long enough to create the
local `crm` database, and then stops it. It does not create the application
schema or seed data.

Start normal development with:

```sh
bun run dev
```

The web process waits for PostgreSQL, creates the schema when the database is
empty, provisions the installation, seeds development data, and starts Vite.

## Reset the development database

The reset removes the local PostgreSQL data directory and all local database
contents. Stop local Culqi360 processes first, then run from the repository
root:

```sh
bun run clean:db
bun run dev:infra:setup
bun run dev
```

`clean:db` removes only `.pgdata`. It does not remove dependencies or uploaded
files.

## Change the schema

Schema modules live in
[`src/server/platform/database/schema/modules/`](../src/server/platform/database/schema/modules/).
Each module has a matching `*.types.ts` file. The ordered schema plan is
[`plan.ts`](../src/server/platform/database/schema/plan.ts).

After changing a schema module:

1. Update its matching database types.
2. Reset the development database.
3. Start Culqi360 so it creates and seeds the new schema.
4. Run the focused tests for the changed domain.
5. Run `bun run check` for contract, generation, or cross-subsystem changes.

[`migrate.ts`](../src/server/platform/database/migrate.ts) hashes the schema and
reference-data modules. Startup returns immediately when the stored hash
matches. It stops with an error when a non-empty database contains a different
hash.

## Run database commands directly

From `apps/web`:

```sh
bun run migrate
bun run seed
```

Production uses `migrate:prod` and `provision:prod`. Those commands read their
configuration from the process environment.

## End-to-end databases

The Playwright suite creates its own template and worker databases. It does not
use or reset the development `crm` database. See
[End-to-end testing](e2e-testing.md) for its lifecycle.
