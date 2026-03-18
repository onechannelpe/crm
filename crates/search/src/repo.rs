use crate::result_contract_generated::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{params, Connection, Row};
use shared::error::ApiError;
use std::sync::LazyLock;

// ── shared column list ────────────────────────────────────────────────────────

const SELECT_COLUMNS: &str = "
  c.dni,
  NULLIF(c.name, '')                AS name,
  NULLIF(c.person_ruc, '')          AS ruc,
  NULLIF(c.birth_date, '')          AS birth_date,
  NULLIF(c.birth_place, '')         AS birth_place,
  NULLIF(c.sex, '')                 AS sex,
  NULLIF(c.marital_status, '')      AS marital_status,
  NULLIF(c.location_text, '')       AS location_text,
  NULLIF(c.ubigeo_code, '')         AS ubigeo_code,
  NULLIF(c.mother_name, '')         AS mother_name,
  NULLIF(c.father_name, '')         AS father_name,
  NULLIF(c.email, '')               AS email,
  NULLIF(c.org_ruc, '')             AS org_ruc,
  NULLIF(c.org_name, '')            AS org_name,
  NULLIF(c.trade_name, '')          AS trade_name,
  NULLIF(c.company_type, '')        AS company_type,
  NULLIF(c.org_status, '')          AS org_status,
  NULLIF(c.org_condition, '')       AS org_condition,
  NULLIF(c.fiscal_address, '')      AS fiscal_address,
  NULLIF(c.registration_date, '')   AS registration_date,
  NULLIF(c.activity_start_date, '') AS activity_start_date,
  NULLIF(c.line_of_business, '')    AS line_of_business,
  NULLIF(c.economic_activity, '')   AS economic_activity,
  NULLIF(c.org_ubigeo_code, '')     AS org_ubigeo_code,
  NULLIF(c.org_department, '')      AS org_department,
  NULLIF(c.org_province, '')        AS org_province,
  NULLIF(c.org_district, '')        AS org_district,
  NULLIF(c.role_name, '')           AS role_name,
  NULLIF(c.role_start_date, '')     AS role_start_date,
  NULLIF(c.rep_doc_type, '')        AS rep_doc_type,
  NULLIF(c.rep_doc_number, '')      AS rep_doc_number,
  NULLIF(c.rep_name, '')            AS rep_name,
  NULLIF(c.phone_primary, '')       AS phone_primary,
  NULLIF(c.phone_secondary, '')     AS phone_secondary";

// ── prepared SQL (initialised once) ──────────────────────────────────────────

static SQL_DNI: LazyLock<String> = LazyLock::new(|| {
    format!("SELECT{SELECT_COLUMNS}\nFROM search_projection c\nWHERE c.dni = ?1 LIMIT ?2")
});

static SQL_RUC: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS},\n  rpa.phones AS sibling_phones\n\
         FROM search_projection c\n\
         LEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc\n\
         WHERE c.org_ruc = ?1 LIMIT ?2"
    )
});

static SQL_PHONE: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\n\
         FROM search_projection c\n\
         JOIN search_projection_phone_index p ON p.projection_id = c.id\n\
         WHERE p.phone = ?1 LIMIT ?2"
    )
});

static SQL_PHONE_ENRICHED: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS},
  CASE
    WHEN c.org_ruc IS NOT NULL AND c.org_ruc <> '' THEN rpa.phones
    ELSE dpa.phones
  END AS sibling_phones
FROM search_projection_phone_index pi
JOIN search_projection c ON c.id = pi.projection_id
LEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc
LEFT JOIN dni_phone_agg dpa ON dpa.dni    = c.dni
WHERE pi.phone = ?1
LIMIT ?2"
    )
});

static SQL_FTS: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\n\
         FROM search_projection c\n\
         JOIN search_projection_fts f ON f.rowid = c.id\n\
         WHERE search_projection_fts MATCH ?1\n\
         ORDER BY rank LIMIT ?2"
    )
});

// ── public query functions ────────────────────────────────────────────────────

pub fn search_by_dni(
    conn: &Connection,
    value: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_DNI, params![value, limit as i64])
}

pub fn search_by_ruc(
    conn: &Connection,
    value: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(&SQL_RUC).map_err(db_err)?;
    let rows = stmt
        .query_map(params![value, limit as i64], map_row_with_siblings)
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err);
    rows
}

pub fn search_by_phone(
    conn: &Connection,
    value: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_PHONE, params![value, limit as i64])
}

pub fn search_by_phone_enriched(
    conn: &Connection,
    value: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(&SQL_PHONE_ENRICHED).map_err(db_err)?;
    let rows = stmt
        .query_map(params![value, limit as i64], map_row_with_siblings)
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err);
    rows
}

pub fn search_by_person_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(
        conn,
        &SQL_FTS,
        params![fts_query("person_name", text), limit as i64],
    )
}

pub fn search_by_company_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(
        conn,
        &SQL_FTS,
        params![fts_query("company_name", text), limit as i64],
    )
}

// ── internals ─────────────────────────────────────────────────────────────────

fn query_rows<P>(conn: &Connection, sql: &str, params: P) -> Result<Vec<SearchRow>, ApiError>
where
    P: rusqlite::Params,
{
    let mut stmt = conn.prepare_cached(sql).map_err(db_err)?;
    let rows = stmt
        .query_map(params, map_row)
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err);
    rows
}

fn map_row(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let org_ruc: Option<String> = row.get("org_ruc")?;
    let org_name: Option<String> = row.get("org_name")?;
    let trade_name: Option<String> = row.get("trade_name")?;
    let company_type: Option<String> = row.get("company_type")?;
    let org_status: Option<String> = row.get("org_status")?;
    let org_condition: Option<String> = row.get("org_condition")?;
    let fiscal_address: Option<String> = row.get("fiscal_address")?;
    let registration_date: Option<String> = row.get("registration_date")?;
    let activity_start_date: Option<String> = row.get("activity_start_date")?;
    let line_of_business: Option<String> = row.get("line_of_business")?;
    let economic_activity: Option<String> = row.get("economic_activity")?;
    let org_ubigeo_code: Option<String> = row.get("org_ubigeo_code")?;
    let org_department: Option<String> = row.get("org_department")?;
    let org_province: Option<String> = row.get("org_province")?;
    let org_district: Option<String> = row.get("org_district")?;

    let org = if org_ruc.is_none()
        && org_name.is_none()
        && trade_name.is_none()
        && company_type.is_none()
        && org_status.is_none()
        && org_condition.is_none()
        && fiscal_address.is_none()
        && registration_date.is_none()
        && activity_start_date.is_none()
        && line_of_business.is_none()
        && economic_activity.is_none()
        && org_ubigeo_code.is_none()
        && org_department.is_none()
        && org_province.is_none()
        && org_district.is_none()
    {
        None
    } else {
        Some(OrgInfo {
            ruc: org_ruc,
            name: org_name,
            trade_name,
            company_type,
            status: org_status,
            condition: org_condition,
            fiscal_address,
            registration_date,
            activity_start_date,
            line_of_business,
            economic_activity,
            ubigeo_code: org_ubigeo_code,
            department: org_department,
            province: org_province,
            district: org_district,
        })
    };

    let role_name: Option<String> = row.get("role_name")?;
    let role_start_date: Option<String> = row.get("role_start_date")?;
    let rep_doc_type: Option<String> = row.get("rep_doc_type")?;
    let rep_doc_number: Option<String> = row.get("rep_doc_number")?;
    let rep_name: Option<String> = row.get("rep_name")?;

    let role = if role_name.is_none()
        && role_start_date.is_none()
        && rep_doc_type.is_none()
        && rep_doc_number.is_none()
        && rep_name.is_none()
    {
        None
    } else {
        Some(RoleInfo {
            name: role_name,
            start_date: role_start_date,
            rep_doc_type,
            rep_doc_number,
            rep_name,
        })
    };

    Ok(SearchRow {
        person: PersonInfo {
            dni: row.get("dni")?,
            name: row.get("name")?,
            ruc: row.get("ruc")?,
            birth_date: row.get("birth_date")?,
            birth_place: row.get("birth_place")?,
            sex: row.get("sex")?,
            marital_status: row.get("marital_status")?,
            location_text: row.get("location_text")?,
            ubigeo_code: row.get("ubigeo_code")?,
            mother_name: row.get("mother_name")?,
            father_name: row.get("father_name")?,
            email: row.get("email")?,
        },
        org,
        role,
        phones: PhoneInfo {
            primary: row.get("phone_primary")?,
            secondary: row.get("phone_secondary")?,
            siblings: None,
        },
    })
}

fn map_row_with_siblings(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let mut base = map_row(row)?;
    let siblings: Option<String> = row.get("sibling_phones")?;
    base.phones.siblings = siblings
        .as_deref()
        .map(|s| s.split(';').map(str::to_owned).collect());
    Ok(base)
}

/// Builds an FTS5 AND-prefix query from a validated text input.
fn fts_query(field: &str, text: &str) -> String {
    let tokens: Vec<String> = text
        .split_whitespace()
        .map(|t| {
            t.chars()
                .filter(|c| c.is_alphanumeric())
                .flat_map(|c| c.to_lowercase())
                .collect()
        })
        .filter(|t: &String| t.len() >= 2)
        .collect();

    let mut out = String::new();
    for token in &tokens {
        if !out.is_empty() {
            out.push_str(" AND ");
        }
        out.push_str(field);
        out.push(':');
        out.push_str(token);
        out.push('*');
    }
    out
}

fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
