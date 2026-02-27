use crate::errors::ApiError;
use crate::storage::sqlite::models::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{Connection, Row};

// Column layout (0-indexed):
//   person :  0  dni
//             1  name (COALESCE fallback)
//             2  birth_date
//             3  birth_place
//             4  sex
//             5  marital_status
//             6  location_text
//             7  ubigeo_code
//             8  mother_name
//             9  father_name
//            10  email
//            11  person_ruc  (natural_ruc10)
//   org    : 12  org_ruc
//            13  org_name
//            14  trade_name
//            15  company_type
//            16  org_status
//            17  org_condition
//            18  fiscal_address
//            19  registration_date
//            20  activity_start_date
//            21  line_of_business
//            22  economic_activity
//   role   : 23  role_name
//            24  role_start_date
//            25  rep_doc_type
//            26  rep_doc_number
//            27  rep_name
//  phones  : 28  phone_primary
//            29  phone_secondary
// enriched adds column 30: sibling_phones

// The 30-column projection shared by all query variants. No SELECT keyword or FROM.
// search_projection already resolves profile/company/role joins during materialization.
pub const SELECT_COLUMNS: &str = "
  c.dni,
  COALESCE(NULLIF(c.name, ''), 'Contacto ' || c.dni) AS name,
  c.birth_date,
  c.birth_place,
  c.sex,
  c.marital_status,
  c.location_text,
  c.ubigeo_code,
  c.mother_name,
  c.father_name,
  c.email,
  NULLIF(c.person_ruc, '') AS person_ruc,
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

    let org = match (org_ruc, org_name) {
        (Some(ruc), Some(name)) => Some(OrgInfo {
            ruc,
            name,
            trade_name: row.get(14)?,
            company_type: row.get(15)?,
            status: row.get(16)?,
            condition: row.get(17)?,
            fiscal_address: row.get(18)?,
            registration_date: row.get(19)?,
            activity_start_date: row.get(20)?,
            line_of_business: row.get(21)?,
            economic_activity: row.get(22)?,
        }),
        _ => None,
    };

    let role_name: Option<String> = row.get(23)?;
    let role = role_name
        .map(|name| -> rusqlite::Result<RoleInfo> {
            Ok(RoleInfo {
                name,
                start_date: row.get(24)?,
                rep_doc_type: row.get(25)?,
                rep_doc_number: row.get(26)?,
                rep_name: row.get(27)?,
            })
        })
        .transpose()?;

    Ok(SearchRow {
        person: PersonInfo {
            dni: row.get(0)?,
            name: row.get(1)?,
            birth_date: row.get(2)?,
            birth_place: row.get(3)?,
            sex: row.get(4)?,
            marital_status: row.get(5)?,
            location_text: row.get(6)?,
            ubigeo_code: row.get(7)?,
            mother_name: row.get(8)?,
            father_name: row.get(9)?,
            email: row.get(10)?,
            ruc: row.get(11)?,
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
