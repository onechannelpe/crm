# Phone Data Integration - CSV Format Documentation

## Overview

This system consolidates phone number data from 6 heterogeneous telecom sources into a single, searchable CSV format for high-performance lookups. The integration process handles 42.9M raw records and produces 12.7M unique phone records.

## Final CSV Format

### Headers
```csv
dni,ruc,phones,operators
```

### Field Specifications

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `dni` | String | Yes | National ID number (DNI) | `10441792498` |
| `ruc` | String | No | Tax ID number (RUC), empty if not available | `20567890123` |
| `phones` | String | Yes | Semicolon-separated phone numbers | `974628516;985123456` |
| `operators` | String | Yes | Comma-separated operator names | `CLARO,MOVISTAR` |

### Design Decisions

#### Why This Format?

1. **Simplicity**: Plain CSV with minimal schema
2. **Searchability**: DNI as primary key for O(1) lookups
3. **Deduplication**: One record per unique DNI
4. **Space Efficiency**: Semicolon-separated phones vs multiple rows

#### Field Rationale

**DNI as Primary Key**
- Every person in Peru has exactly one DNI
- Natural primary key for phone ownership lookups
- Enables fast HashMap indexing in Rust (O(1) access)

**Optional RUC Field**
- Not all individuals have tax IDs (RUC)
- Empty string rather than NULL for CSV simplicity
- Enables business entity lookups when available

**Semicolon-Separated Phones** 
- Many people have multiple phone numbers
- Single row per person (normalized approach would create duplication)
- Semicolon chosen to avoid conflicts with CSV commas
- Easy to split in code: `phones.split(';')`

**Operator Field**
- Tracks which telecom company owns each number
- Useful for analytics and data verification
- Comma-separated when person has phones from multiple operators

## Source Data Integration

### Raw Data Sources
| File | Records | Encoding | Format | Issues |
|------|---------|----------|--------|--------|
| `celulares.txt` | 22.4M | Latin-1 | Mixed | Encoding problems |
| `CLARO_POST_202508.txt` | 7.7M | UTF-8 | Structured | Clean |
| `MOVISTAR_POST_202508.txt` | 6.6M | UTF-8 | Structured | Clean |
| `BITEL_POST_MS.txt` | 3.8M | UTF-8-BOM | Structured | BOM header |
| `Representantes_ENRIQUECIDO.txt` | 2.4M | UTF-8 | Structured | Clean |

**Total Input**: 42,970,448 records
**Final Output**: 12,703,291 unique DNIs (70% deduplication)

### Integration Process

#### 1. Encoding Detection
```python
def detect_encoding(self, file_path):
    # Each file uses different encoding
    if 'celulares' in str(file_path):
        return 'latin-1'  # Handles all byte sequences
    
    # Try common encodings
    for encoding in ['utf-8', 'utf-8-sig', 'latin-1']:
        # ... test encoding
```

**Why Multiple Encodings?**
- Legacy systems used different character sets
- `celulares.txt`: Old system, Latin-1 encoding
- Modern files: UTF-8 with/without BOM
- Robust detection prevents data corruption

#### 2. Memory-Efficient Streaming
```python
def process_in_batches(self, batch_size=10000):
    # Process chunks to avoid 42M record memory spike
    for batch in self.read_batches(batch_size):
        yield self.normalize_batch(batch)
```

**Why Streaming?**
- 42M records would exceed available RAM (>8GB)
- Process chunks of 10K records at a time
- Write incrementally to avoid memory buildup
- Essential for production deployment on limited hardware

#### 3. Data Normalization
```python
def normalize_record(self, raw_record, source):
    # Extract DNI, RUC, phone consistently across formats
    dni = self.clean_dni(raw_record['id_field'])
    ruc = self.extract_ruc(raw_record) or ""
    phone = self.clean_phone(raw_record['phone_field'])
    return [dni, ruc, phone, source]
```

**Why Normalization?**
- Each source has different column names/positions
- Phone formats vary (with/without country codes)
- DNI padding differences (leading zeros)
- Ensures consistent lookup behavior

#### 4. Deduplication Strategy
```python
def deduplicate_phones(self, dni_phone_map):
    # Merge multiple records per DNI
    for dni in dni_phone_map:
        phones = set(dni_phone_map[dni])  # Remove duplicates
        operators = self.get_operators_for_phones(phones)
        yield [dni, ruc, ';'.join(phones), ','.join(operators)]
```

**Why Deduplication?**
- Same person appears in multiple telecom databases
- Reduces dataset from 42.9M → 12.7M (70% reduction)
- Faster searches (fewer records to scan)
- Eliminates redundant information

## Usage Examples

### CSV Structure
```csv
dni,ruc,phones,operators
10441792498,,974628516,CLARO
43269801,20567890123,986331303;951234567,CLARO;MOVISTAR
72815547,,948636348,CLARO
```

### Loading in Rust
```rust
// Efficient CSV parsing for millions of records
let mut reader = csv::ReaderBuilder::new()
    .has_headers(true)
    .from_path("integrated_phone_data.csv")?;

for result in reader.records() {
    let record = result?;
    let dni = record[0].to_string();
    let phones: Vec<String> = record[2].split(';').map(String::from).collect();
    // Build HashMap indexes for O(1) lookups
}
```

### Python Analysis
```python
import pandas as pd
df = pd.read_csv('integrated_phone_data.csv')

# Find all phones for a DNI
dni_phones = df[df['dni'] == '10441792498']['phones'].iloc[0].split(';')

# Count by operator
operator_counts = df['operators'].str.split(',').explode().value_counts()
```

## File Size & Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **File Size** | 502 MB | Compressed efficiently |
| **Load Time** | ~43 seconds | One-time startup cost |
| **Memory Usage** | 2 GB | In-memory HashMap indexes |
| **Lookup Speed** | O(1) | HashMap-based retrieval |
| **Storage Format** | CSV | Human-readable, tool-friendly |

## Why CSV Over Other Formats?

### Considered Alternatives
- **SQLite**: Slower than in-memory HashMap
- **Parquet**: Adds complexity, binary format
- **JSON**: 3x larger file size
- **Binary**: Not human-readable, harder to debug

### CSV Advantages
- **Simplicity**: Any tool can read/write CSV
- **Debugging**: Human-readable data format
- **Portability**: Works across all programming languages
- **Size**: Compact text representation
- **Processing**: Standard libraries everywhere

## Migration & Versioning

### Current Version: v1.0
- Schema: `dni,ruc,phones,operators`  
- Separator: Semicolon for phones, comma for operators
- Encoding: UTF-8 output (universal compatibility)

### Future Considerations
- **v2.0**: Add timestamp field for data freshness
- **Compression**: Gzip compression for 60% size reduction
- **Partitioning**: Split by DNI prefix for distributed processing
- **Validation**: Add checksum field for data integrity

This format balances simplicity with performance, enabling lightning-fast phone lookups while maintaining human-readable data for debugging and analysis.