# onechannel.pe

A monorepo for a backend service, a CRM frontend, and a browser extension. Under
active development; APIs and directory boundaries may change.

To run the project:

```sh
bun install
bun run dev

echo "SESSION_SECRET=$(openssl rand -hex 32)" > ../../.env
echo "WEBAUTHN_RP_ID=localhost" >> ../../.env
echo "WEBAUTHN_ORIGIN=http://localhost:3000" >> ../../.env
echo "NODE_ENV=development" >> ../../.env
ENGINE_URL=http://localhost:5000
```

## Repository structure

```txt
.
├── apps/
│   ├── backend/         # Backend service. Hono (HTTP), bun:sqlite + Kysely, typia.
│   ├── crm/             # Primary CRM frontend (SolidJS).
│   └── extension/       # Browser extension (planned: WXT + SolidJS + WebRTC engine).
└── packages/
    ├── api-contract/    # Canonical API contract (types, validation).
    ├── db/              # Schema definitions, migrations, repository patterns (Kysely).
    ├── ui/              # Shared SolidJS UI components and primitives (Tailwind CSS).
    └── config/          # Shared TypeScript configuration.
```

Maintainers: @totallynotdavid
