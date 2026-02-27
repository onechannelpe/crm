use crate::errors::ApiError;
use crate::storage::sqlite::models::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{Connection, Row};

// Column layout (0-indexed):
//   person : 0  dni
//             1  name
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
//  phones  : 25  phone_primary
//            26  phone_secondary
// enriched adds column 27: sibling_phones
pub const SELECT_BASE: &str = "
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
  NULLIF(c.phone_secondary, '') AS phone_secondary
FROM contacts_serving c
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
";

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
            primary: row.get(25)?,
            secondary: row.get(26)?,
            siblings: None,
        },
    })
}

pub fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
