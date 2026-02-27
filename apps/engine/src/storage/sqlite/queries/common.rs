use crate::errors::ApiError;
use crate::storage::sqlite::models::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{Connection, Row};

// Column layout (0-indexed):
//   person : 0  dni
//            1  name
//   org    : 2  org_ruc
//            3  org_name
//   role   : 4  role_name
//            5  role_start_date
//            6  rep_doc_type
//            7  rep_doc_number
//            8  rep_name
//  phones  : 9  phone_primary
//           10  phone_secondary
// enriched adds column 11: sibling_phones
//
// The 11-column projection shared by all query variants. No SELECT keyword or FROM.
// search_projection already resolves profile/company/role joins during materialization.
pub const SELECT_COLUMNS: &str = "
  c.dni,
  NULLIF(c.name, '') AS name,
  NULLIF(c.org_ruc, '') AS org_ruc,
  NULLIF(c.org_name, '') AS org_name,
  NULLIF(c.role_name, '') AS role_name,
  NULLIF(c.role_start_date, '') AS role_start_date,
  NULLIF(c.rep_doc_type, '') AS rep_doc_type,
  NULLIF(c.rep_doc_number, '') AS rep_doc_number,
  NULLIF(c.rep_name, '') AS rep_name,
  NULLIF(c.phone_primary, '') AS phone_primary,
  NULLIF(c.phone_secondary, '') AS phone_secondary";

pub fn query_rows<P>(conn: &Connection, sql: &str, params: P) -> Result<Vec<SearchRow>, ApiError>
where
    P: rusqlite::Params,
{
    let mut stmt = conn.prepare_cached(sql).map_err(db_err)?;
    let rows = stmt.query_map(params, map_row).map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

pub fn map_row(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let org_ruc: Option<String> = row.get(2)?;
    let org_name: Option<String> = row.get(3)?;

    let org = if org_ruc.is_none() && org_name.is_none() {
        None
    } else {
        Some(OrgInfo {
            ruc: org_ruc,
            name: org_name,
        })
    };

    let role_name: Option<String> = row.get(4)?;
    let role_start_date: Option<String> = row.get(5)?;
    let rep_doc_type: Option<String> = row.get(6)?;
    let rep_doc_number: Option<String> = row.get(7)?;
    let rep_name: Option<String> = row.get(8)?;
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
            dni: row.get(0)?,
            name: row.get(1)?,
        },
        org,
        role,
        phones: PhoneInfo {
            primary: row.get(9)?,
            secondary: row.get(10)?,
            siblings: None,
        },
    })
}

pub fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
