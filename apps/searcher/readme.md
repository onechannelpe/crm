# phone lookup service

HTTP API for looking up phone records from a pre-integrated CSV dataset. Data is
loaded into memory at startup and served via in-memory indexes.

Build and run:

```sh
cargo build --release
DATA_PATH=/path/to/integrated_phone_data.csv ./target/release/phone_lookup_api
```

Endpoints:

- GET /lookup/dni/{dni}
- GET /lookup/ruc/{ruc}
- GET /lookup/phone/{phone}
- GET /health
- GET /stats

Data:

Input CSV headers:

```txt
dni,ruc,phones,operators
```

Fields:

- dni: required
- ruc: optional (empty string if missing)
- phones: semicolon-separated
- operators: comma-separated

Notes:

- Dataset size is ~12.7M unique DNIs (~500MB CSV).
- Startup cost is paid once; lookups are served from memory.
