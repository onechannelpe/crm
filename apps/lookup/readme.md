# lookup service

HTTP API for managing contact lead data from CSV. Data loaded into memory at
startup and served via pre-built indexes.

Build and run:

```sh
cargo build --release
export API_KEYS="key1,key2,key3"
export DATA_PATH="./data/contacts.csv"
./target/release/lead_searcher
```

Configuration via environment variables:

```sh
HOST=127.0.0.1                # default
PORT=5000                     # default
DATA_PATH=./data/contacts.csv # required
API_KEYS=key1,key2            # required, comma-separated
RATE_LIMIT_PER_MINUTE=60      # default
```

Endpoints (protected routes require `x-api-key` header):

```
GET  /health                        # public
GET  /leads/unassigned?limit=10     # protected
POST /leads/assign                  # protected, body: {lead_ids, user_id, branch_id}
GET  /stats                         # protected
```

Data format (CSV at `./data/contacts.csv`):

```csv
dni,name,phone_primary,phone_secondary,org_ruc,org_name
12345678,Juan Perez,987654321,912345678,20123456789,Acme Corp
```

Fields: `dni` and `name` required, others optional. Empty cells allowed.

Data directory structure:

```txt
project/
├── src/
├── data/              # create this
│   └── contacts.csv   # place CSV here
└── Cargo.toml
```
