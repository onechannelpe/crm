<h1 align="center">onechannel.pe</h1>

<p align="center">
  <a href="apps/web/readme.md">web</a>
  ·
  <a href="apps/engine/readme.md">engine</a>
  ·
  <a href="apps/pipeline/readme.md">pipeline</a>
  ·
  <a href="apps/extension/readme.md">extension</a>
</p>

<p align="center">
  <a href="https://github.com/onechannelpe/crm/actions/workflows/web.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/web.yml/badge.svg?branch=master" alt="web"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/engine.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/engine.yml/badge.svg?branch=master" alt="engine"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml/badge.svg?branch=master" alt="pipeline"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/extension.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/extension.yml/badge.svg?branch=master" alt="extension"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml/badge.svg?branch=master" alt="contracts"></a>
</p>

This monorepo is built around a shared search dataset (`contacts.sqlite`).

```mermaid
flowchart LR
    src[source DBs] -->|normalize| pipe[pipeline]
    pipe -->|build| contacts[(contacts.sqlite)]
    engine[engine] -->|read| contacts
    web[web] -->|request contacts| engine
    web <--> appdb[(crm.db)]
    ext[extension] -->|get assignments| web

    click pipe "https://github.com/onechannelpe/crm/tree/master/apps/pipeline"
    click engine "https://github.com/onechannelpe/crm/tree/master/apps/engine"
    click web "https://github.com/onechannelpe/crm/tree/master/apps/web"
    click ext "https://github.com/onechannelpe/crm/tree/master/apps/extension"
    click contacts "https://github.com/onechannelpe/crm"
````

The pipeline builds a SQLite snapshot from source files and shared contracts. The engine serves that snapshot through `/v1/search` and `/v1/health`. The web application serves the CRM UI, keeps application state in its own SQLite database, and calls the engine through HMAC-signed HTTP. The browser extension receives signed handoff messages from the web application and syncs call state through extension API routes.

The contract between web and engine is [`contracts/engine-api.json`](contracts/engine-api.json). The generated bindings in the web application and the engine request and response checks are derived from that file. If this file changes, regenerate bindings with `bun run generate`. Validate generated artifacts with `bun run check:contract`. Validate projection and search compatibility with `bun run check:projection-contract` and `bun run check:search-contract`.

## Applications

- [`apps/web/`](apps/web/)
  The main application. It serves the UI, API routes, and the maintenance worker.
- [`apps/engine/`](apps/engine/)
  The search service. It verifies signed requests and queries the published SQLite dataset.
- [`apps/pipeline/`](apps/pipeline/)
  The dataset pipeline. It validates source files, builds the staged dataset, and promotes the SQLite snapshot used by the engine.
- [`apps/extension/`](apps/extension/)
  The browser extension for call handling. It receives assignment handoff and syncs call state back to the web application.

## Get started

Install the toolchain, install dependencies, create `.env`, generate contract bindings, and start the web application and engine:

```sh
mise install # install mise if you don't have it yet: curl https://mise.run | sh
bun install
cp .env.example .env
bun run generate
bun run dev
```

`bun run dev` starts the engine and web application. Alternatively, you can start a single process from the repo root with `bun run dev:web`, `bun run dev:engine`, or `bun run dev:worker`.

## Production deployment

The production target for the web app is Node.
Bun remains the workspace installer and dev tool, but the built web server and worker run under Node.

From a fresh clone on the server:

```sh
cp .env.example .env
./scripts/prod/web-build.sh
./scripts/prod/web-migrate.sh
./scripts/prod/web-start.sh
```

Run the maintenance worker separately:

```sh
./scripts/prod/web-worker.sh
```

Production scripts load env from the repo root `.env` by default.
Set `WEB_ENV_FILE=/path/to/.env` if the server stores it elsewhere.
For a real server, prefer a path outside the repo such as `/etc/web/web.env`.

Systemd unit examples live in [`ops/systemd/web.service`](ops/systemd/web.service) and [`ops/systemd/web-worker.service`](ops/systemd/web-worker.service).

## Read this first

- Web request and auth flow: [`apps/web/src/middleware.ts`](apps/web/src/middleware.ts), [`apps/web/src/lib/auth/access/request-auth.ts`](apps/web/src/lib/auth/access/request-auth.ts)
- Web service wiring: [`apps/web/src/server/shared/context.ts`](apps/web/src/server/shared/context.ts), [`apps/web/src/server/shared/registry.ts`](apps/web/src/server/shared/registry.ts)
- Engine startup and request handling: [`apps/engine/src/main.rs`](apps/engine/src/main.rs), [`apps/engine/src/api/handlers.rs`](apps/engine/src/api/handlers.rs)
- Pipeline orchestration: [`apps/pipeline/src/pipeline.rs`](apps/pipeline/src/pipeline.rs), [`apps/pipeline/src/cli.rs`](apps/pipeline/src/cli.rs)
- Extension runtime and handoff flow: [`apps/extension/src/background/runtime.ts`](apps/extension/src/background/runtime.ts), [`apps/extension/src/services/external-auth.ts`](apps/extension/src/services/external-auth.ts)

## Validation

```sh
bun run check
bun run check:web
bun run check:engine
bun run check:contract
bun run check:search-contract
bun run check:projection-contract
```
