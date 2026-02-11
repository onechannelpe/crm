# lookup service

In-memory lead queue API for contact distribution. Loads CSV into memory at startup with O(1) assignment tracking via HashSet. Stateless service designed for horizontal scaling.

## Architecture

### Data Flow

**Startup**: CSV → `load_csv()` validates (DNI + name required) → `Vec<Contact>` (sequential storage, index = id)

**Request Path** (authenticated/rate-limited):
```
GET /leads/unassigned?limit=10
  ↓
contacts.iter().enumerate()
  ↓
filter(i, not_in_assigned_set)  # O(n) scan, O(1) lookups
  ↓
take(limit) → Vec<Lead> JSON response
```

**Assignment Flow**:
```
POST /leads/assign {lead_ids: [0,5,12]}
  ↓
Validate: id < contacts.len()  # Bounds check prevents invalid access
  ↓
assigned.insert(id)  # HashSet O(1) insertion
  ↓
Return count of newly assigned
```

**Thread Safety**: RwLock<HashSet> protects assignment state. Contacts are immutable, no locking required for reads.

### Design Decisions

**Simple Queue, Not Search System**
- No RUC/phone indexes. Original design had HashMap lookups we never used.
- Use case is sequential lead distribution, not complex queries.
- Scanning 1M contacts linearly < 1ms. Premature optimization wastes memory and complexity.
- Result: Removed ~200 LOC of unused index infrastructure, zero warnings.

**ID = Array Index**
- Critical: Contact.id must equal Vec position for safe mark_assigned().
- CSV parsing assigns id = contacts.len() after validation, not csv_row_index.
- Prevents off-by-one bugs when CSV has invalid rows (id mismatch between API response and internal storage).
- See: data.rs load_csv() skips invalid rows BEFORE assigning id.

**Token Bucket Rate Limiting**
- Formula: tokens_per_second = capacity / 60
- Elapsed time used as continuous refill, not discrete minute buckets.
- Prevents degradation to ~1 req/min on production workloads.
- See: middleware/rate.rs Bucket::refill() uses floating-point precision.

**Stateless Service**
- Assignment state lives in memory only. Process restart resets assignments.
- No persistence layer - design assumes assignments are ephemeral (session-like).
- If durability needed, add RDB flush to Redis/PG and implement recovery on startup.
- Scales horizontally with consistent hashing on api-key or request ID (see notes below).

### Trade-offs

**Memory vs CPU**
- Vec scan O(n) per request. At 1M contacts, ~0.5ms p50 on modern CPU.
- Alternative: Maintain separate available_queue index. Trade 8MB memory for <0.1ms latency gain.
- Current choice: Memory efficiency wins for batch operations.

**Weak Consistency**
- No two-phase commit between assignment and downstream DB writes.
- Clients must retry failed /leads/assign if DB write fails. Service won't know.
- Acceptable for lead distribution (eventual consistency OK). If critical, add callback queue.

**Single CSV Load**
- No hot reload. Changes require restart.
- Acceptable for static contact lists. If real-time updates needed, use database instead.

## Build and run

```sh
cargo build --release
export API_KEYS="key1,key2,key3"
export DATA_PATH="./data/contacts.csv"
./target/release/one-lookup
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
POST /leads/assign                  # protected, body: {lead_ids}
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

## Scaling

**Horizontal**
- Stateless except in-memory assignment state. Deploy N instances with shared assignment store (Redis SET for api_key → assigned_ids).
- Each instance loads full CSV at startup. No coordination needed.
- Use routing: consistent hash on api-key → same instance for assignments.

**Vertical**
- Memory: ~200 bytes per contact. 1M contacts ≈ 200MB + overhead.
- CPU: Vec scan is SIMD-friendly on modern x86. Profile with 1M+ rows before optimizing.
- Axum/Tokio handle thousands of concurrent connections efficiently.

**CSV Size Limits**
- No hard limit. CSV parser is streaming, uses constant memory.
- Contacts vector is heap-allocated once at startup. Ensure DATA_PATH read completes before accepting requests (current: implicit via async startup).

## Operational Notes

**Security**
- API key validation uses SHA256 hashing (timing-safe).
- Rate limiter per api-key. Anonymous requests share "anonymous" bucket (useful for testing, disable in production).
- All sensitive endpoints (/leads/*, /stats) require authentication + rate limiting.

**Monitoring**
- /stats endpoint provides total, assigned, available contacts + memory usage.
- Instrument rate limiter: high 429s may indicate that concurrency exceeds capacity/minute (increase RATE_LIMIT_PER_MINUTE or scale horizontally).

**Critical Implementation Detail**
- Contact.id is assigned during CSV load as contacts.len(), NOT csv_row_index.
- Ensures API response id always valid for /leads/assign.
- If CSV has invalid rows (missing DNI/name), they're skipped before id assignment - no gaps in id space.
