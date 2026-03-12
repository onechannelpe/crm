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

This monorepo is built around a shared search dataset.

The pipeline builds a SQLite snapshot from source files and shared contracts. The engine serves that snapshot through `/v1/search` and `/v1/health`. The web application serves the CRM UI, keeps application state in its own SQLite database, and calls the engine through HMAC-signed HTTP. The browser extension receives signed handoff messages from the web application and syncs call state through extension API routes.

The contract between web and engine is [`contracts/engine-api.json`](contracts/engine-api.json). The generated bindings in the web application and the engine request and response checks are derived from that file. If this file changes, regenerate bindings with `bun run generate`. Validate generated artifacts with `bun run check:contract`. Validate projection and search compatibility with `bun run check:projection-contract` and `bun run check:search-contract`.

## Applications

- [`apps/web/`](apps/web/)
  The CRM application. It serves the UI, API routes, and the maintenance worker.
- [`apps/engine/`](apps/engine/)
  The search service. It verifies signed requests and queries the published SQLite dataset.
- [`apps/pipeline/`](apps/pipeline/)
  The dataset pipeline. It validates source files, builds the staged dataset, and promotes the SQLite snapshot used by the engine.
- [`apps/extension/`](apps/extension/)
  The browser extension for call handling. It receives assignment handoff and syncs call state back to the web application.

## Get started

Install the toolchain, install dependencies, create `.env`, generate contract bindings, and start the web application and engine:

```sh
# install mise first if needed: curl https://mise.run | sh
mise install
bun install
cp .env.example .env
bun run generate
bun run dev
```

`bun run dev` starts the engine and web application. `bun run dev:web`, `bun run dev:engine`, and `bun run dev:worker` start a single process from the repo root.

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
