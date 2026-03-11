<h1 align="center">onechannel.pe</h1>
<p align="center">
  CRM for contact search, lead routing, and call logging.
  <br />
  <a href="apps/web/readme.md">Web</a>
  ·
  <a href="apps/engine/readme.md">Engine</a>
  ·
  <a href="apps/pipeline/readme.md">Pipeline</a>
  ·
  <a href="apps/extension/readme.md">Extension</a>
</p>

<p align="center">
  <a href="https://github.com/onechannelpe/crm/actions/workflows/web.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/web.yml/badge.svg?branch=master" alt="web"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/engine.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/engine.yml/badge.svg?branch=master" alt="engine"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml/badge.svg?branch=master" alt="pipeline"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/extension.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/extension.yml/badge.svg?branch=master" alt="extension"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml/badge.svg?branch=master" alt="contracts"></a>
</p>

## About

This repository is built around a shared search dataset.

The pipeline builds a SQLite snapshot from source files and shared contracts. The engine serves that snapshot through `/v1/search` and `/v1/health`. The web application serves the CRM UI, keeps application state in its own SQLite database, and calls the engine through HMAC-signed HTTP. The browser extension receives signed handoff messages from the web application and syncs call state through extension API routes.

The contract between web and engine is [`contracts/engine-api.json`](contracts/engine-api.json). Regenerate bindings with `bun run generate` after changing that file. Validate generated artifacts with `bun run check:contract`. Validate projection and search compatibility with `bun run check:projection-contract` and `bun run check:search-contract`.

## Applications

- [`apps/web/`](apps/web/) SolidStart application, CRM API routes, background maintenance worker
- [`apps/engine/`](apps/engine/) Rust search API and SQLite query layer
- [`apps/pipeline/`](apps/pipeline/) Rust batch pipeline for building and promoting the search dataset
- [`apps/extension/`](apps/extension/) browser extension runtime, popup, sidepanel, sync client

## Get started

Install the toolchain, install dependencies, create `.env`, generate contract bindings, and start the web application and engine:

```sh
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
