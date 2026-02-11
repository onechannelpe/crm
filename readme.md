# onechannel.pe

A monorepo for a backend service, a CRM frontend, and a browser extension. Under
active development; APIs and directory boundaries may change.

To run the project:

```sh
# Install dependencies
bun install

# Run CRM web app
cd apps/web
bun run dev

# (Optional) Run phone lookup searcher service
cd apps/searcher
# Set DATA_PATH environment variable to your CSV file
cargo run --release
```

## Environment Variables

Create a `.env` file in the root directory:

```sh
# Session and Authentication
SESSION_SECRET=$(openssl rand -hex 32)
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
NODE_ENV=development

# External Services
ENGINE_URL=http://localhost:5000
SEARCHER_URL=http://localhost:3000

# Searcher Service (for apps/searcher)
DATA_PATH=path/to/integrated_phone_data.csv
```

## Repository structure

```txt
.
├── apps/
│   ├── web/             # Full-stack CRM app (SolidJS + SolidStart).
│   └── searcher/        # Phone lookup microservice (Rust + Axum).
└── packages/
    └── (planned)        # Shared packages for future modularization.
```

Maintainers: @totallynotdavid
