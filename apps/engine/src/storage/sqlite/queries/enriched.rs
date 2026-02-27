use super::common::{db_err, map_row};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, Row, params};

// Extends SELECT_BASE (cols 0-26) with sibling_phones at col 27.
const SQL_PHONE_ENRICHED: &str = concat!(
    "
SELECT
  c.dni,
  COALESCE(NULLIF(c.name, ''), 'Contacto ' || c.dni) AS name,
  pp.birth_date,
  pp.birth_place,
  pp.sex,
  pp.marital_status,
  pp.location_text,
  pp.ubigeo_code,
  pp.mother_name,
  pp.father_name,
  pp.email,
  NULLIF(pp.natural_ruc10, '') AS person_ruc,
  NULLIF(c.org_ruc, '') AS org_ruc,
  NULLIF(c.org_name, '') AS org_name,
  NULLIF(cp.trade_name, '') AS trade_name,
  NULLIF(cp.company_type, '') AS company_type,
  NULLIF(cp.status, '') AS org_status,
  NULLIF(cp.condition, '') AS org_condition,
  NULLIF(cp.fiscal_address, '') AS fiscal_address,
  NULLIF(cp.registration_date, '') AS registration_date,
  NULLIF(cp.activity_start_date, '') AS activity_start_date,
  NULLIF(cp.line_of_business, '') AS line_of_business,
  NULLIF(cp.economic_activity, '') AS economic_activity,
  NULLIF(pcr.role_name, '') AS role_name,
  NULLIF(pcr.role_start_date, '') AS role_start_date,
  NULLIF(c.phone_primary, '') AS phone_primary,
  NULLIF(c.phone_secondary, '') AS phone_secondary,
  CASE
    WHEN c.org_ruc IS NOT NULL AND c.org_ruc <> '' THEN rpa.phones
    ELSE dpa.phones
  END AS sibling_phones
FROM phone_index pi
JOIN contacts_serving c ON c.id = pi.contact_id
LEFT JOIN person_profile pp ON pp.dni = c.dni
LEFT JOIN company_profile cp ON cp.ruc = c.org_ruc
LEFT JOIN person_company_role pcr
  ON pcr.person_id = pp.person_id
  AND pcr.company_id = cp.company_id
  AND pcr.role_id = (
    SELECT MIN(r2.role_id)
    FROM person_company_role r2
    WHERE r2.person_id = pp.person_id
      AND r2.company_id = cp.company_id
  )
LEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc
LEFT JOIN dni_phone_agg dpa ON dpa.dni = c.dni
WHERE pi.phone = ?1
LIMIT ?2
"
);

pub fn search_phone_enriched(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(SQL_PHONE_ENRICHED).map_err(db_err)?;
    let rows = stmt
        .query_map(params![phone, limit as i64], map_row_with_siblings)
        .map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

fn map_row_with_siblings(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let base = map_row(row)?;
    let siblings: Option<String> = row.get(27)?;
    Ok(base.with_siblings(siblings))
}
