import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

export function renderProjectionContractRust(
  spec: ProjectionSpec,
  prefix: string,
  sourceFile: string,
): string {
  const allPaths = spec.fields.map((f) => f.path);
  const nullablePaths = spec.fields
    .filter((f) => f.nullable)
    .map((f) => f.path);
  const mappings = spec.fields.flatMap((f) =>
    f.storage.map((s) => ({ path: f.path, table: s.table, column: s.column })),
  );

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `// Source: ${sourceFile}`,
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    "pub struct ProjectionStorageMapping {",
    "    pub path: &'static str,",
    "    pub table: &'static str,",
    "    pub column: &'static str,",
    "}",
    "",
    `pub const ${prefix}_NAME: &str = ${JSON.stringify(spec.projection)};`,
    "",
    `pub const ${prefix}_PATHS: &[&str] = &[`,
    ...allPaths.map((p) => `    ${JSON.stringify(p)},`),
    "];",
    "",
    `pub const ${prefix}_NULLABLE_PATHS: &[&str] = &[`,
    ...nullablePaths.map((p) => `    ${JSON.stringify(p)},`),
    "];",
    "",
    `pub const ${prefix}_STORAGE_MAPPINGS: &[ProjectionStorageMapping] = &[`,
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

export function renderResultContractRust(
  docSpec: ProjectionSpec,
  companySpec: ProjectionSpec,
): string {
  const docGroups = groupByObject(docSpec.fields);
  const companyGroups = groupByObject(companySpec.fields);
  const definedStructs = new Set<string>();

  const lines = [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/doc-projection.json + contracts/engine/company-projection.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "use serde::Serialize;",
    "",
  ];

  // Generate info structs for doc projection
  for (const { objectName, fields } of docGroups) {
    const typeName = infoTypeName(objectName);
    if (definedStructs.has(typeName)) continue;
    definedStructs.add(typeName);
    lines.push("#[derive(Debug, Serialize)]");
    lines.push(`pub struct ${typeName} {`);
    for (const field of fields) {
      lines.push(`    pub ${fieldProp(field)}: ${rustFieldType(field)},`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate DocumentRow
  lines.push("#[derive(Debug, Serialize)]");
  lines.push("pub struct DocumentRow {");
  for (const { objectName } of docGroups) {
    const container = infoTypeName(objectName);
    const rustType = NULLABLE_OBJECTS.has(objectName)
      ? `Option<${container}>`
      : container;
    lines.push(`    pub ${objectName}: ${rustType},`);
  }
  lines.push("}");
  lines.push("");

  // Generate info structs for company projection (skip already defined)
  for (const { objectName, fields } of companyGroups) {
    const typeName = infoTypeName(objectName);
    if (definedStructs.has(typeName)) continue;
    definedStructs.add(typeName);
    lines.push("#[derive(Debug, Serialize)]");
    lines.push(`pub struct ${typeName} {`);
    for (const field of fields) {
      lines.push(`    pub ${fieldProp(field)}: ${rustFieldType(field)},`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate CompanyRow
  lines.push("#[derive(Debug, Serialize)]");
  lines.push("pub struct CompanyRow {");
  for (const { objectName } of companyGroups) {
    const container = infoTypeName(objectName);
    const rustType = NULLABLE_OBJECTS.has(objectName)
      ? `Option<${container}>`
      : container;
    lines.push(`    pub ${objectName}: ${rustType},`);
  }
  lines.push("}");
  lines.push("");

  // Generate discriminated union enum
  lines.push("#[derive(Debug, Serialize)]");
  lines.push('#[serde(tag = "kind", rename_all = "snake_case")]');
  lines.push("pub enum SearchResult {");
  lines.push("    Document(DocumentRow),");
  lines.push("    Company(CompanyRow),");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function rustFieldType(field: ProjectionField): string {
  if (field.value_type === "string_array") {
    return field.nullable ? "Option<Vec<String>>" : "Vec<String>";
  }
  if (field.value_type === "integer") {
    return field.nullable ? "Option<i64>" : "i64";
  }
  return field.nullable ? "Option<String>" : "String";
}
