use crate::errors::ApiError;
use crate::storage::sqlite::models::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{Connection, Row};

// Column layout (0-indexed):
//   person : 0  dni
//            1  name
//            2  ruc (person_ruc column)
//            3  birth_date
//            4  birth_place
//            5  sex
//            6  marital_status
//            7  location_text
//            8  ubigeo_code
//            9  mother_name
//           10  father_name
//           11  email
//   org    : 12 org_ruc
//            13 org_name
//            14 trade_name
//            15 company_type
//            16 org_status
//            17 org_condition
//            18 fiscal_address
//            19 registration_date
//            20 activity_start_date
//            21 line_of_business
//            22 economic_activity
//   role   : 23 role_name
//            24 role_start_date
//            25 rep_doc_type
//            26 rep_doc_number
//            27 rep_name
//  phones  : 28 phone_primary
//            29 phone_secondary
// enriched adds column 30: sibling_phones
//
// The 30-column projection shared by all query variants. No SELECT keyword or FROM.
// search_projection already resolves profile/company/role joins during materialization.
pub const SELECT_COLUMNS: &str = "
  c.dni,
  NULLIF(c.name, '') AS name,
  NULLIF(c.person_ruc, '') AS ruc,
  NULLIF(c.birth_date, '') AS birth_date,
  NULLIF(c.birth_place, '') AS birth_place,
  NULLIF(c.sex, '') AS sex,
  NULLIF(c.marital_status, '') AS marital_status,
  NULLIF(c.location_text, '') AS location_text,
  NULLIF(c.ubigeo_code, '') AS ubigeo_code,
  NULLIF(c.mother_name, '') AS mother_name,
  NULLIF(c.father_name, '') AS father_name,
  NULLIF(c.email, '') AS email,
  NULLIF(c.org_ruc, '') AS org_ruc,
  NULLIF(c.org_name, '') AS org_name,
  NULLIF(c.trade_name, '') AS trade_name,
  NULLIF(c.company_type, '') AS company_type,
  NULLIF(c.org_status, '') AS org_status,
  NULLIF(c.org_condition, '') AS org_condition,
  NULLIF(c.fiscal_address, '') AS fiscal_address,
  NULLIF(c.registration_date, '') AS registration_date,
  NULLIF(c.activity_start_date, '') AS activity_start_date,
  NULLIF(c.line_of_business, '') AS line_of_business,
  NULLIF(c.economic_activity, '') AS economic_activity,
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
    let org_ruc: Option<String> = row.get(12)?;
    let org_name: Option<String> = row.get(13)?;
    let trade_name: Option<String> = row.get(14)?;
    let company_type: Option<String> = row.get(15)?;
    let org_status: Option<String> = row.get(16)?;
    let org_condition: Option<String> = row.get(17)?;
    let fiscal_address: Option<String> = row.get(18)?;
    let registration_date: Option<String> = row.get(19)?;
    let activity_start_date: Option<String> = row.get(20)?;
    let line_of_business: Option<String> = row.get(21)?;
    let economic_activity: Option<String> = row.get(22)?;

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
        })
    };

    let role_name: Option<String> = row.get(23)?;
    let role_start_date: Option<String> = row.get(24)?;
    let rep_doc_type: Option<String> = row.get(25)?;
    let rep_doc_number: Option<String> = row.get(26)?;
    let rep_name: Option<String> = row.get(27)?;
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
            ruc: row.get(2)?,
            birth_date: row.get(3)?,
            birth_place: row.get(4)?,
            sex: row.get(5)?,
            marital_status: row.get(6)?,
            location_text: row.get(7)?,
            ubigeo_code: row.get(8)?,
            mother_name: row.get(9)?,
            father_name: row.get(10)?,
            email: row.get(11)?,
        },
        org,
        role,
        phones: PhoneInfo {
            primary: row.get(28)?,
            secondary: row.get(29)?,
            siblings: None,
        },
    })
}

pub fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
