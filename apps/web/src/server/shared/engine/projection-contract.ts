// GENERATED FILE. DO NOT EDIT.
export const SEARCH_PROJECTION_NAME = "search_projection" as const;
export const SEARCH_PROJECTION_PATHS = [
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
] as const;
export type SearchProjectionPath = (typeof SEARCH_PROJECTION_PATHS)[number];
export const SEARCH_PROJECTION_NULLABLE_PATHS = [
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
] as const;
export type SearchProjectionNullablePath =
  (typeof SEARCH_PROJECTION_NULLABLE_PATHS)[number];
