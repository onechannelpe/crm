import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

export function renderProjectionContractRust(spec: ProjectionSpec): string {
  const allPaths = spec.fields.map((f) => f.path);
  const nullablePaths = spec.fields
    .filter((f) => f.nullable)
    .map((f) => f.path);
  const mappings = spec.fields.flatMap((f) =>
    f.storage.map((s) => ({ path: f.path, table: s.table, column: s.column })),
  );

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/search-projection.json",
    "// Generator: tools/codegen/bin/generate-search-projection-contract.ts",
    "#![allow(dead_code)]",
    "",
    "pub struct ProjectionStorageMapping {",
    "    pub path: &'static str,",
    "    pub table: &'static str,",
    "    pub column: &'static str,",
    "}",
    "",
    `pub const SEARCH_PROJECTION_NAME: &str = ${JSON.stringify(spec.projection)};`,
    "",
    "pub const SEARCH_PROJECTION_PATHS: &[&str] = &[",
    ...allPaths.map((p) => `    ${JSON.stringify(p)},`),
    "];",
    "",
    "pub const SEARCH_PROJECTION_NULLABLE_PATHS: &[&str] = &[",
    ...nullablePaths.map((p) => `    ${JSON.stringify(p)},`),
    "];",
    "",
    "pub const SEARCH_PROJECTION_STORAGE_MAPPINGS: &[ProjectionStorageMapping] = &[",
    ...mappings.map((m) =>
      [
        "    ProjectionStorageMapping {",
        `        path: ${JSON.stringify(m.path)},`,
        `        table: ${JSON.stringify(m.table)},`,
        `        column: ${JSON.stringify(m.column)},`,
        "    },",
      ].join("\n"),
    ),
    "];",
    "",
  ].join("\n");
}

export function renderResultContractRust(spec: ProjectionSpec): string {
  const groups = groupByObject(spec.fields);

  const lines = [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/search-projection.json",
    "// Generator: tools/codegen/bin/generate-search-projection-contract.ts",
    "use serde::Serialize;",
    "",
  ];

  for (const { objectName, fields } of groups) {
    lines.push("#[derive(Debug, Serialize)]");
    lines.push(`pub struct ${infoTypeName(objectName)} {`);
    for (const field of fields) {
      lines.push(`    pub ${fieldProp(field)}: ${rustFieldType(field)},`);
    }
    lines.push("}");
    lines.push("");
  }

  lines.push("#[derive(Debug, Serialize)]");
  lines.push("pub struct SearchRow {");
  for (const { objectName } of groups) {
    const container = infoTypeName(objectName);
    const rustType = NULLABLE_OBJECTS.has(objectName)
      ? `Option<${container}>`
      : container;
    lines.push(`    pub ${objectName}: ${rustType},`);
  }
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function rustFieldType(field: ProjectionField): string {
  if (field.value_type === "string_array") {
    return field.nullable ? "Option<Vec<String>>" : "Vec<String>";
  }
  return field.nullable ? "Option<String>" : "String";
}
