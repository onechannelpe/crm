# onechannel.pe

[![web quality](https://github.com/onechannelpe/crm/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/lint.yml)
[![web tests](https://github.com/onechannelpe/crm/actions/workflows/tests.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/tests.yml)
[![repo guard](https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml/badge.svg?branch=master)](https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml)

crm monorepo (web app + engine service).

## quick start

bootstrap local dev environment:

```sh
bun install
cp .env.example .env
bun run generate:engine-contract
```

start services:

```sh
bun run dev:engine
bun run dev:web
```

## repo docs

- web: [`apps/web/readme.md`](apps/web/readme.md)
- engine: [`apps/engine/readme.md`](apps/engine/readme.md)
- contract source of truth: [`contracts/engine-api.json`](contracts/engine-api.json)
- contract generator: [`scripts/generate-engine-contract.ts`](scripts/generate-engine-contract.ts)

## maintenance commands

run full repository checks:

```sh
bun run check
```

run checks individually:

```sh
bun run check:engine-contract
bun run check:web
bun run check:engine
```

for command details, read [`package.json`](package.json).
