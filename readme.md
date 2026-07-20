# Culqi360

Culqi360 is Infinity's internal sales CRM. It combines lead management, sales
workflows, merchant performance reporting, search, and call handling.

<p align="center">
  <a href="https://github.com/totallynotdavid/culqi360/actions/workflows/web.yml"><img src="https://github.com/totallynotdavid/culqi360/actions/workflows/web.yml/badge.svg?branch=master" alt="Web workflow status"></a>
  <a href="https://github.com/totallynotdavid/culqi360/actions/workflows/engine.yml"><img src="https://github.com/totallynotdavid/culqi360/actions/workflows/engine.yml/badge.svg?branch=master" alt="Engine workflow status"></a>
  <a href="https://github.com/totallynotdavid/culqi360/actions/workflows/pipeline.yml"><img src="https://github.com/totallynotdavid/culqi360/actions/workflows/pipeline.yml/badge.svg?branch=master" alt="Pipeline workflow status"></a>
  <a href="https://github.com/totallynotdavid/culqi360/actions/workflows/extension.yml"><img src="https://github.com/totallynotdavid/culqi360/actions/workflows/extension.yml/badge.svg?branch=master" alt="Extension workflow status"></a>
  <a href="https://github.com/totallynotdavid/culqi360/actions/workflows/contracts.yml"><img src="https://github.com/totallynotdavid/culqi360/actions/workflows/contracts.yml/badge.svg?branch=master" alt="Contracts workflow status"></a>
</p>

This repository contains four main components:

- [`apps/web/`](apps/web/) serves the Culqi360 UI, API routes, and maintenance
  worker.
- [`crates/engine/`](crates/engine/) serves contact search and candidate
  selection from published SQLite datasets.
- [`crates/pipeline/`](crates/pipeline/) builds those datasets from source
  files.
- [`apps/extension/`](apps/extension/) handles browser-based call workflows.

See [System architecture](docs/architecture.md) for the connections between
these components and their data stores.

## Get started

Install the toolchain and dependencies, then create the local environment file:

```sh
mise install
bun install
cp .env.example .env
```

Fill the required values in `.env`. See
[Web configuration](apps/web/docs/configuration.md) for requirements and
defaults. Then generate contracts, initialize PostgreSQL, and start Culqi360:

```sh
bun run generate
bun run dev:infra:setup
bun run dev
```

Run `bun run dev:infra:setup` once for a new checkout. The normal development
command, `bun run dev`, starts PostgreSQL, the engine, the web server, and the
maintenance worker. The web process creates the schema and seeds development
data before starting Vite.

See [Database development](apps/web/docs/database.md) before resetting the local
database or changing a schema module.

## Run one component

```sh
bun run dev:infra
bun run dev:engine
bun run dev:web
bun run dev:worker
```

The web server requires PostgreSQL. Search and candidate-assignment flows also
require the engine.

## Validate the repository

Run the complete repository check from the root:

```sh
bun run check
```

The command checks Rust, generated contracts, search compatibility, web types,
lint, and formatting. Focused checks are available in
[`package.json`](package.json).

Run tests with the component that owns them:

```sh
bun run --cwd apps/web test
bun run test:engine
bun run test:extension:integration
```

## Documentation

- [System architecture](docs/architecture.md)
- [Web application](apps/web/readme.md)
- [Web configuration](apps/web/docs/configuration.md)
- [Database development](apps/web/docs/database.md)
- [End-to-end testing](apps/web/docs/e2e-testing.md)
- [Merchant GPV](apps/web/docs/merchant-gpv.md)
- [User-facing terminology](apps/web/docs/glossary.md)

Container deployments use [`compose.app.yml`](compose.app.yml) and
[`compose.engine.yml`](compose.engine.yml). Their environment templates live in
[`ops/deployment/`](ops/deployment/).
