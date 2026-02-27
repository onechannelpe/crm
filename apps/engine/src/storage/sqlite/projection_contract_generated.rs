// GENERATED FILE. DO NOT EDIT.
pub struct ProjectionStorageMapping {
    pub path: &'static str,
    pub table: &'static str,
    pub column: &'static str,
}

pub const SEARCH_PROJECTION_NAME: &str = "search_projection";
pub const SEARCH_PROJECTION_PATHS: &[&str] = &[
    "person.dni",
    "person.name",
    "org.ruc",
    "org.name",
    "role.name",
    "role.start_date",
    "role.rep_doc_type",
    "role.rep_doc_number",
    "role.rep_name",
    "phones.primary",
    "phones.secondary",
    "phones.siblings",
];
pub const SEARCH_PROJECTION_NULLABLE_PATHS: &[&str] = &[
    "person.name",
    "org.ruc",
    "org.name",
    "role.name",
    "role.start_date",
    "role.rep_doc_type",
    "role.rep_doc_number",
    "role.rep_name",
    "phones.primary",
    "phones.secondary",
    "phones.siblings",
];
pub const SEARCH_PROJECTION_STORAGE_MAPPINGS: &[ProjectionStorageMapping] = &[
    ProjectionStorageMapping {
        path: "person.dni",
        table: "search_projection",
        column: "dni",
    },
    ProjectionStorageMapping {
        path: "person.name",
        table: "search_projection",
        column: "name",
    },
    ProjectionStorageMapping {
        path: "org.ruc",
        table: "search_projection",
        column: "org_ruc",
    },
    ProjectionStorageMapping {
        path: "org.name",
        table: "search_projection",
        column: "org_name",
    },
    ProjectionStorageMapping {
        path: "role.name",
        table: "search_projection",
        column: "role_name",
    },
    ProjectionStorageMapping {
        path: "role.start_date",
        table: "search_projection",
        column: "role_start_date",
    },
    ProjectionStorageMapping {
        path: "role.rep_doc_type",
        table: "search_projection",
        column: "rep_doc_type",
    },
    ProjectionStorageMapping {
        path: "role.rep_doc_number",
        table: "search_projection",
        column: "rep_doc_number",
    },
    ProjectionStorageMapping {
        path: "role.rep_name",
        table: "search_projection",
        column: "rep_name",
    },
    ProjectionStorageMapping {
        path: "phones.primary",
        table: "search_projection",
        column: "phone_primary",
    },
    ProjectionStorageMapping {
        path: "phones.secondary",
        table: "search_projection",
        column: "phone_secondary",
    },
    ProjectionStorageMapping {
        path: "phones.siblings",
        table: "ruc_phone_agg",
        column: "phones",
    },
    ProjectionStorageMapping {
        path: "phones.siblings",
        table: "dni_phone_agg",
        column: "phones",
    },
];
