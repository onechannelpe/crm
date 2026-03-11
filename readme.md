<h1 align="center">onechannel.pe</h1>

<p align="center">
  The next iteration of our CRM for sales operations, org management, and contact search.
</p>

<p align="center">
  <a href="apps/web/">web</a>
  ·
  <a href="apps/engine/">engine</a>
  ·
  <a href="apps/pipeline/">pipeline</a>
  ·
  <a href="apps/extension/">extension</a>
</p>

<p align="center">
  <a href="https://github.com/onechannelpe/crm/actions/workflows/lint.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/lint.yml/badge.svg?branch=master" alt="web quality"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/tests.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/tests.yml/badge.svg?branch=master" alt="web tests"></a>
  <a href="https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml"><img src="https://github.com/onechannelpe/crm/actions/workflows/repo-guard.yml/badge.svg?branch=master" alt="repo guard"></a>
  <a href="https://codspeed.io/onechannelpe/crm?utm_source=badge"><img src="https://img.shields.io/endpoint?url=https://codspeed.io/badge.json" alt="CodSpeed"></a>
</p>

## Quick start

```sh
mise install
bun install
cp .env.example .env
bun run generate
bun run dev
```

`bun run dev:web`, `bun run dev:engine`, and `bun run dev:worker` start the web app, engine, and maintenance worker individually.

## Checks

```sh
bun run check              # generate + rust + contracts + web + lint + formatting
bun run check:web          # web typecheck + lint
bun run check:engine       # cargo check for engine and pipeline
bun run check:contract     # verify engine bindings match contract
bun run check:search-contract
bun run check:projection-contract
```

See [`package.json`](package.json) for all scripts.
