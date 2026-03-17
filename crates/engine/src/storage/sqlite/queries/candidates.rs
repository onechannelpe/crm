use super::common::db_err;
use crate::api::contracts::{CandidateStrategy, LeadCandidate};
use crate::errors::ApiError;
use rusqlite::{Connection, Row, params};
use std::sync::LazyLock;

static SQL_BASE: LazyLock<&str> = LazyLock::new(|| {
    "
    SELECT
            MIN(c.id) AS candidate_id,
      c.org_ruc AS ruc,
      COALESCE(NULLIF(c.org_name, ''), NULLIF(c.trade_name, ''), c.org_ruc) AS organization_name,
      c.dni AS dni,
      COALESCE(NULLIF(c.name, ''), c.dni) AS person_name,
      NULLIF(c.phone_primary, '') AS phone_primary
    FROM search_projection c
    WHERE c.org_ruc IS NOT NULL
      AND c.org_ruc <> ''
      AND c.dni IS NOT NULL
      AND c.dni <> ''
      AND c.phone_primary IS NOT NULL
      AND c.phone_primary <> ''
    GROUP BY c.org_ruc, c.dni
    "
});

static SQL_CANDIDATES_BALANCED: LazyLock<String> = LazyLock::new(|| {
    format!(
        "{base}\nORDER BY ((candidate_id * 1315423911 + ?2 * 97 + ?3 * 193) & 2147483647), c.org_ruc, c.dni\nLIMIT ?1",
        base = *SQL_BASE
    )
});

static SQL_CANDIDATES_FRESHNESS: LazyLock<String> = LazyLock::new(|| {
    format!(
        "{base}\nORDER BY candidate_id DESC\nLIMIT ?1",
        base = *SQL_BASE
    )
});

static SQL_CANDIDATES_CONVERSION: LazyLock<String> = LazyLock::new(|| {
    format!(
        "{base}\nORDER BY c.org_ruc, c.dni\nLIMIT ?1",
        base = *SQL_BASE
    )
});

pub fn list_lead_candidates(
    conn: &Connection,
    limit: usize,
    branch_id: i64,
    user_id: i64,
    strategy: CandidateStrategy,
) -> Result<Vec<LeadCandidate>, ApiError> {
    let (sql, with_context) = match strategy {
        CandidateStrategy::Balanced => (SQL_CANDIDATES_BALANCED.as_str(), true),
        CandidateStrategy::Freshness => (SQL_CANDIDATES_FRESHNESS.as_str(), false),
        CandidateStrategy::Conversion => (SQL_CANDIDATES_CONVERSION.as_str(), false),
    };

    let mut stmt = conn.prepare_cached(sql).map_err(db_err)?;
    if with_context {
        let rows = stmt
            .query_map(params![limit as i64, branch_id, user_id], map_candidate)
            .map_err(db_err)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
    } else {
        let rows = stmt
            .query_map(params![limit as i64], map_candidate)
            .map_err(db_err)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
    }
}

fn map_candidate(row: &Row<'_>) -> rusqlite::Result<LeadCandidate> {
    Ok(LeadCandidate {
        ruc: row.get("ruc")?,
        organization_name: row.get("organization_name")?,
        dni: row.get("dni")?,
        person_name: row.get("person_name")?,
        phone_primary: row.get("phone_primary")?,
    })
}
