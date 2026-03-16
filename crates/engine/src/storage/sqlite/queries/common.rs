use crate::errors::ApiError;
use crate::storage::sqlite::models::{OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow};
use rusqlite::{Connection, Row};

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
  NULLIF(c.org_ubigeo_code, '') AS org_ubigeo_code,
  NULLIF(c.org_department, '') AS org_department,
  NULLIF(c.org_province, '') AS org_province,
  NULLIF(c.org_district, '') AS org_district,
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

pub fn map_row_with_siblings(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let base = map_row(row)?;
    let siblings: Option<String> = row.get("sibling_phones")?;
    Ok(base.with_siblings(siblings))
}

pub fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
