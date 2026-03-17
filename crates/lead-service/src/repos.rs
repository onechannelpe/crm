use crate::contracts::{CandidateStrategy, LeadCandidate, LeadImportRow};
use engine_infra::error::ApiError;
use rusqlite::{Connection, Row, params};
use std::sync::LazyLock;

struct LeadRow {
    ruc: String,
    organization_name: String,
    dni: String,
    person_name: String,
    phone_primary: String,
}

const SELECT_LEAD: &str = "
    SELECT
      ruc,
      COALESCE(NULLIF(organization_name, ''), ruc) AS organization_name,
      dni,
      COALESCE(NULLIF(person_name, ''), dni) AS person_name,
      phone_primary
    FROM leads
    WHERE active = 1";

static SQL_BALANCED: LazyLock<String> = LazyLock::new(|| {
    format!(
        "{SELECT_LEAD}\nORDER BY ((id * 1315423911 + ?2 * 97 + ?3 * 193) & 2147483647)\nLIMIT ?1"
    )
});

static SQL_FRESHNESS: LazyLock<String> =
    LazyLock::new(|| format!("{SELECT_LEAD}\nORDER BY id DESC\nLIMIT ?1"));

static SQL_CONVERSION: LazyLock<String> =
    LazyLock::new(|| format!("{SELECT_LEAD}\nORDER BY quality_tier DESC, id\nLIMIT ?1"));

pub fn list_lead_candidates(
    conn: &Connection,
    limit: usize,
    branch_id: i64,
    user_id: i64,
    strategy: CandidateStrategy,
) -> Result<Vec<LeadCandidate>, ApiError> {
    match strategy {
        CandidateStrategy::Balanced => {
            let mut stmt = conn.prepare_cached(&SQL_BALANCED).map_err(db_err)?;
            let rows = stmt
                .query_map(params![limit as i64, branch_id, user_id], map_row)
                .map_err(db_err)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
        }
        CandidateStrategy::Freshness => {
            let mut stmt = conn.prepare_cached(&SQL_FRESHNESS).map_err(db_err)?;
            let rows = stmt
                .query_map(params![limit as i64], map_row)
                .map_err(db_err)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
        }
        CandidateStrategy::Conversion => {
            let mut stmt = conn.prepare_cached(&SQL_CONVERSION).map_err(db_err)?;
            let rows = stmt
                .query_map(params![limit as i64], map_row)
                .map_err(db_err)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
        }
    }
}

/// Returns (inserted_count, updated_count).
/// Validation is the caller's responsibility; this function has no business logic.
pub fn upsert_batch(
    conn: &Connection,
    rows: &[LeadImportRow],
    source: &str,
    now: i64,
) -> Result<(usize, usize), ApiError> {
    let mut inserted = 0usize;
    let mut updated = 0usize;

    for row in rows {
        let quality_tier = row.quality_tier.unwrap_or(1);

        let n = conn
            .execute(
                "INSERT OR IGNORE INTO leads
                   (ruc, dni, organization_name, person_name, phone_primary,
                    quality_tier, product_tag, branch_tag, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
                params![
                    row.ruc,
                    row.dni,
                    row.organization_name,
                    row.person_name,
                    row.phone_primary,
                    quality_tier,
                    row.product_tag,
                    row.branch_tag,
                    source,
                    now,
                ],
            )
            .map_err(|e| ApiError::Service(format!("insert failed: {e}")))?;

        if n == 1 {
            inserted += 1;
        } else {
            conn.execute(
                "UPDATE leads SET
                   organization_name = ?3,
                   person_name       = ?4,
                   phone_primary     = ?5,
                   quality_tier      = ?6,
                   source            = ?7,
                   updated_at        = ?8
                 WHERE ruc = ?1 AND dni = ?2",
                params![
                    row.ruc,
                    row.dni,
                    row.organization_name,
                    row.person_name,
                    row.phone_primary,
                    quality_tier,
                    source,
                    now,
                ],
            )
            .map_err(|e| ApiError::Service(format!("update failed: {e}")))?;
            updated += 1;
        }
    }

    Ok((inserted, updated))
}

fn map_row(row: &Row<'_>) -> rusqlite::Result<LeadCandidate> {
    let r = LeadRow {
        ruc: row.get("ruc")?,
        organization_name: row.get("organization_name")?,
        dni: row.get("dni")?,
        person_name: row.get("person_name")?,
        phone_primary: row.get("phone_primary")?,
    };
    Ok(LeadCandidate {
        ruc: r.ruc,
        organization_name: r.organization_name,
        dni: r.dni,
        person_name: r.person_name,
        phone_primary: r.phone_primary,
    })
}

fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
