use super::common::db_err;
use crate::api::contracts::LeadCandidate;
use crate::errors::ApiError;
use rusqlite::{Connection, params};
use std::sync::LazyLock;

static SQL_CANDIDATES: LazyLock<&str> = LazyLock::new(|| {
    "
    SELECT
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
    ORDER BY c.org_ruc, c.dni
    LIMIT ?1
    "
});

pub fn list_lead_candidates(
    conn: &Connection,
    limit: usize,
) -> Result<Vec<LeadCandidate>, ApiError> {
    let mut stmt = conn.prepare_cached(*SQL_CANDIDATES).map_err(db_err)?;
    let rows = stmt
        .query_map(params![limit as i64], |row| {
            Ok(LeadCandidate {
                ruc: row.get("ruc")?,
                organization_name: row.get("organization_name")?,
                dni: row.get("dni")?,
                person_name: row.get("person_name")?,
                phone_primary: row.get("phone_primary")?,
            })
        })
        .map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}
