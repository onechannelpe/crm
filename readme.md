<h1 align="center">onechannel.pe</h1>

<p align="center">CRM monorepo with web, engine, pipeline, and extension applications.</p>

<p align="center">
  <a href="https://github.com/onechannelpe/crm/actions/workflows/web.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/web.yml/badge.svg?branch=master" alt="web"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/engine.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/engine.yml/badge.svg?branch=master" alt="engine"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/pipeline.yml/badge.svg?branch=master" alt="pipeline"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/extension.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/extension.yml/badge.svg?branch=master" alt="extension"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/contracts.yml/badge.svg?branch=master" alt="contracts"></a>
</p>

## Applications

- [`apps/web/`](apps/web/) serves the CRM UI and background maintenance worker.
- [`apps/engine/`](apps/engine/) serves the `/v1/search` and `/v1/health` HTTP endpoints over SQLite.
- [`apps/pipeline/`](apps/pipeline/) builds the SQLite dataset and publishes it to the engine DB path.
- [`apps/extension/`](apps/extension/) runs the browser extension runtime, popup, and sidepanel.

## How it works

The pipeline reads source files and contracts, writes intermediate artifacts under `apps/pipeline/data`, and publishes `apps/engine/data/contacts.sqlite`. The engine opens that SQLite file in read-only mode and serves authenticated search requests. The web app serves the CRM UI, stores application data in the web database, and calls the engine through HMAC-signed HTTP. The extension exchanges handoff and sync traffic with the web app through the configured web origin.

The main contract boundary between web and engine is [`contracts/engine-api.json`](contracts/engine-api.json). Contract changes are generated into web bindings by `bun run generate` and validated by `bun run check:contract`. Search projection contract validation is handled by `bun run check:projection-contract` and `bun run check:search-contract`.

Senior developer starting points:

- Web request and auth flow: [`apps/web/src/middleware.ts`](apps/web/src/middleware.ts), [`apps/web/src/lib/auth/access/request-auth.ts`](apps/web/src/lib/auth/access/request-auth.ts)
- Web service wiring: [`apps/web/src/server/shared/context.ts`](apps/web/src/server/shared/context.ts), [`apps/web/src/server/shared/registry.ts`](apps/web/src/server/shared/registry.ts)
- Engine startup and request handling: [`apps/engine/src/main.rs`](apps/engine/src/main.rs), [`apps/engine/src/api/handlers.rs`](apps/engine/src/api/handlers.rs)
- Pipeline orchestration: [`apps/pipeline/src/pipeline.rs`](apps/pipeline/src/pipeline.rs), [`apps/pipeline/src/cli.rs`](apps/pipeline/src/cli.rs)
- Extension runtime and web handoff: [`apps/extension/src/background/runtime.ts`](apps/extension/src/background/runtime.ts), [`apps/extension/src/services/external-auth.ts`](apps/extension/src/services/external-auth.ts)

## Local setup

```sh
mise install
bun install
cp .env.example .env
bun run generate
bun run dev
```

`bun run dev` starts the engine and web app. `bun run dev:web`, `bun run dev:engine`, and `bun run dev:worker` start a single process from the repo root.

## Validation

```sh
bun run check
bun run check:web
bun run check:engine
bun run check:contract
bun run check:search-contract
bun run check:projection-contract
```

Application-specific details are in [`apps/web/readme.md`](apps/web/readme.md), [`apps/engine/readme.md`](apps/engine/readme.md), [`apps/pipeline/readme.md`](apps/pipeline/readme.md), and [`apps/extension/readme.md`](apps/extension/readme.md).
