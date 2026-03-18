// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/search-projection.json
// Generator: tools/codegen/bin/generate-search-projection-contract.ts
#![allow(dead_code)]

pub struct ProjectionStorageMapping {
    pub path: &'static str,
    pub table: &'static str,
    pub column: &'static str,
}

pub const SEARCH_PROJECTION_NAME: &str = "search_projection";

pub const SEARCH_PROJECTION_PATHS: &[&str] = &[
    "person.dni",
    "person.name",
    "person.ruc",
    "person.birth_date",
    "person.birth_place",
    "person.sex",
    "person.marital_status",
    "person.location_text",
    "person.ubigeo_code",
    "person.mother_name",
    "person.father_name",
    "person.email",
    "org.ruc",
    "org.name",
    "org.trade_name",
    "org.company_type",
    "org.status",
    "org.condition",
    "org.fiscal_address",
    "org.registration_date",
    "org.activity_start_date",
    "org.line_of_business",
    "org.economic_activity",
    "org.ubigeo_code",
    "org.department",
    "org.province",
    "org.district",
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
    "person.ruc",
    "person.birth_date",
    "person.birth_place",
    "person.sex",
    "person.marital_status",
    "person.location_text",
    "person.ubigeo_code",
    "person.mother_name",
    "person.father_name",
    "person.email",
    "org.ruc",
    "org.name",
    "org.trade_name",
    "org.company_type",
    "org.status",
    "org.condition",
    "org.fiscal_address",
    "org.registration_date",
    "org.activity_start_date",
    "org.line_of_business",
    "org.economic_activity",
    "org.ubigeo_code",
    "org.department",
    "org.province",
    "org.district",
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
        path: "person.ruc",
        table: "search_projection",
        column: "person_ruc",
    },
    ProjectionStorageMapping {
        path: "person.birth_date",
        table: "search_projection",
        column: "birth_date",
    },
    ProjectionStorageMapping {
        path: "person.birth_place",
        table: "search_projection",
        column: "birth_place",
    },
    ProjectionStorageMapping {
        path: "person.sex",
        table: "search_projection",
        column: "sex",
    },
    ProjectionStorageMapping {
        path: "person.marital_status",
        table: "search_projection",
        column: "marital_status",
    },
    ProjectionStorageMapping {
        path: "person.location_text",
        table: "search_projection",
        column: "location_text",
    },
    ProjectionStorageMapping {
        path: "person.ubigeo_code",
        table: "search_projection",
        column: "ubigeo_code",
    },
    ProjectionStorageMapping {
        path: "person.mother_name",
        table: "search_projection",
        column: "mother_name",
    },
    ProjectionStorageMapping {
        path: "person.father_name",
        table: "search_projection",
        column: "father_name",
    },
    ProjectionStorageMapping {
        path: "person.email",
        table: "search_projection",
        column: "email",
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
        path: "org.trade_name",
        table: "search_projection",
        column: "trade_name",
    },
    ProjectionStorageMapping {
        path: "org.company_type",
        table: "search_projection",
        column: "company_type",
    },
    ProjectionStorageMapping {
        path: "org.status",
        table: "search_projection",
        column: "org_status",
    },
    ProjectionStorageMapping {
        path: "org.condition",
        table: "search_projection",
        column: "org_condition",
    },
    ProjectionStorageMapping {
        path: "org.fiscal_address",
        table: "search_projection",
        column: "fiscal_address",
    },
    ProjectionStorageMapping {
        path: "org.registration_date",
        table: "search_projection",
        column: "registration_date",
    },
    ProjectionStorageMapping {
        path: "org.activity_start_date",
        table: "search_projection",
        column: "activity_start_date",
    },
    ProjectionStorageMapping {
        path: "org.line_of_business",
        table: "search_projection",
        column: "line_of_business",
    },
    ProjectionStorageMapping {
        path: "org.economic_activity",
        table: "search_projection",
        column: "economic_activity",
    },
    ProjectionStorageMapping {
        path: "org.ubigeo_code",
        table: "search_projection",
        column: "org_ubigeo_code",
    },
    ProjectionStorageMapping {
        path: "org.department",
        table: "search_projection",
        column: "org_department",
    },
    ProjectionStorageMapping {
        path: "org.province",
        table: "search_projection",
        column: "org_province",
    },
    ProjectionStorageMapping {
        path: "org.district",
        table: "search_projection",
        column: "org_district",
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
