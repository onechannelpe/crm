# Phone Lookup Searcher Setup

## Overview

The phone lookup searcher is a high-performance Rust microservice that provides phone number lookups from CSV data. It's designed to be used by executives and administrators to search for phone numbers by DNI, RUC, or phone number.

## Prerequisites

- Rust 1.70+ (install from https://rustup.rs/)
- CSV data file with phone records
- At least 4GB RAM available

## CSV Format

The searcher expects a CSV file with the following format:

```csv
dni,ruc,phones,operators
10441792498,,974628516,CLARO
20567890123,20567890123,985123456;974628516,MOVISTAR;CLARO
```

Fields:
- `dni`: National ID (required)
- `ruc`: Tax ID (optional, can be empty)
- `phones`: Semicolon-separated phone numbers
- `operators`: Comma-separated operator names (matches phones)

See `apps/searcher/CSV_FORMAT_README.md` for detailed format specification.

## Installation

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Build the Searcher Service

```bash
cd apps/searcher
cargo build --release
```

This will create an optimized binary at `target/release/phone_lookup_api`.

## Configuration

Set the following environment variables:

```bash
# Path to your CSV data file
export DATA_PATH=/path/to/integrated_phone_data.csv

# Server configuration (optional)
export HOST=0.0.0.0
export PORT=3001

# Logging level (optional)
export RUST_LOG=phone_lookup_api=info
```

Or create a `.env` file in the `apps/searcher` directory.

## Running the Service

### Development Mode

```bash
cd apps/searcher
DATA_PATH=/path/to/data.csv cargo run
```

### Production Mode

```bash
cd apps/searcher
DATA_PATH=/path/to/data.csv ./target/release/phone_lookup_api
```

The service will:
1. Load and index the CSV data (~43 seconds for 12.7M records)
2. Start the HTTP server on `http://localhost:3000`
3. Display startup statistics

## Integration with CRM

The CRM web app connects to the searcher service via the `SEARCHER_URL` environment variable:

```bash
# In root .env file
SEARCHER_URL=http://localhost:3000
```

## Access Control

Phone lookup functionality is restricted to users with the following roles:
- `executive`
- `admin`

Access is enforced in `apps/web/src/server/modules/searcher/actions.ts`.

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Lookup by DNI
```bash
curl http://localhost:3000/lookup/dni/10441792498
```

### Lookup by RUC
```bash
curl http://localhost:3000/lookup/ruc/20567890123
```

### Lookup by Phone
```bash
curl http://localhost:3000/lookup/phone/974628516
```

### Statistics
```bash
curl http://localhost:3000/stats
```

## Performance

- **Startup Time**: ~43 seconds (one-time, loads 12.7M records)
- **Memory Usage**: ~2GB RAM
- **Response Time**: 1-3ms per lookup
- **Throughput**: 300+ requests/second

## Troubleshooting

### Out of Memory
Ensure your system has at least 4GB RAM available. The service loads all data into memory for O(1) lookups.

### Slow Startup
Startup time depends on CSV file size. For 12.7M records, expect ~43 seconds. This is a one-time cost.

### Connection Refused
Verify the searcher service is running and the `SEARCHER_URL` in the CRM's `.env` file is correct.

## Security Considerations

- The searcher service has no built-in authentication
- It should run on an internal network or localhost
- Access control is handled by the CRM application
- Consider adding API keys or JWT tokens for production deployment

## Monitoring

Watch server logs for:
- Startup statistics (records loaded, memory usage)
- Request logging (if enabled)
- Error messages

Example log output:
```
INFO phone_lookup_api: CSV loaded successfully
INFO phone_lookup_api: Total records: 12703291
INFO phone_lookup_api: Memory usage: 2000.5 MB
INFO phone_lookup_api: Server listening on 0.0.0.0:3000
```

## Production Deployment

For production:
1. Use the release build (`cargo build --release`)
2. Run as a systemd service or in a container
3. Set up health check monitoring
4. Configure log aggregation
5. Ensure adequate RAM (4GB+)
6. Consider adding rate limiting
7. Use a reverse proxy (nginx/caddy) for TLS

See `apps/searcher/README.md` for architectural details.
