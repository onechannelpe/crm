# onechannel.pe

[![web quality](https://github.com/onechannelpe/crm/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/lint.yml)
[![web tests](https://github.com/onechannelpe/crm/actions/workflows/tests.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/tests.yml)
[![repo guard](https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml)
[![CodSpeed Badge](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://codspeed.io/onechannelpe/crm?utm_source=badge)

crm monorepo (web app + engine service).

## quick start

bootstrap local dev environment:

```sh
mise install
bun install
cp .env.example .env
mise run generate-engine-contract
```

start services:

```sh
bun run dev
```

or run them individually:

```sh
mise run dev-engine
mise run dev-web
```

## repo docs

- web: [`apps/web/readme.md`](apps/web/readme.md)
- engine: [`apps/engine/readme.md`](apps/engine/readme.md)
- contract source of truth: [`contracts/engine-api.json`](contracts/engine-api.json)
- contract generator: [`scripts/generate-engine-contract.ts`](scripts/generate-engine-contract.ts)

## maintenance commands

run full repository checks:

```sh
mise run check
```

run checks individually:

```sh
mise run check-engine-contract
mise run check-web
mise run check-engine
```

for task details, read [`mise.toml`](mise.toml). web-only scripts are in [`package.json`](package.json).
