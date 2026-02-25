<h1 align="center">onechannel.pe</h1>

<p align="center">
  Internal CRM for sales operations, org management, and contact search.
</p>

<p align="center">
  <a href="apps/web/readme.md">Web</a>
  ·
  <a href="apps/engine/readme.md">Engine</a>
  ·
  <a href="contracts/engine-api.json">Contract</a>
</p>

<p align="center">
  <a href="https://github.com/onechannelpe/crm/actions/workflows/lint.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/lint.yml/badge.svg?branch=master" alt="web quality"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/tests.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/tests.yml/badge.svg?branch=master" alt="web tests"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml/badge.svg?branch=master" alt="repo guard"></a>
  <a href="https://codspeed.io/onechannelpe/crm?utm_source=badge"><img src="https://img.shields.io/endpoint?url=https://codspeed.io/badge.json" alt="CodSpeed"></a>
</p>

## Architecture

| Apps | |
|---|---|
| [Web](apps/web/readme.md) | [Engine](apps/engine/readme.md) |

| Packages | |
|---|---|
| [Notifications](packages/notifications/) | [Download Docs](packages/download-docs/) |

The web-to-engine API is defined in [`contracts/engine-api.json`](contracts/engine-api.json) and code-generated via [`scripts/generate-engine-contract.ts`](scripts/generate-engine-contract.ts).

## Quick start

```sh
mise install
bun install
cp .env.example .env
bun run generate:engine-contract
bun run dev
```

`bun run dev:web` and `bun run dev:engine` to start individually.

## Checks

```sh
bun run check            # all (contract, web, engine, lint, format, clippy)
bun run check:web        # typecheck + lint
bun run check:engine     # cargo check
bun run check:contract   # verify bindings match contract
```

See [`package.json`](package.json) for all scripts.
