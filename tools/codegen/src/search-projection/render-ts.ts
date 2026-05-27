import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

export function renderProjectionContractTs(
  spec: ProjectionSpec,
  prefix: string,
  sourceFile: string,
): string {
  const allPaths = spec.fields.map((f) => f.path);
  const nullablePaths = spec.fields
    .filter((f) => f.nullable)
    .map((f) => f.path);

  const renderArray = (values: string[]): string =>
    `[\n${values.map((v) => `  ${JSON.stringify(v)},`).join("\n")}\n]`;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `// Source: ${sourceFile}`,
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    `export const ${prefix}_NAME = ${JSON.stringify(spec.projection)} as const;`,
    `export const ${prefix}_PATHS = ${renderArray(allPaths)} as const;`,
    `export type ${prefix}_PATH = (typeof ${prefix}_PATHS)[number];`,
    "",
    `export const ${prefix}_NULLABLE_PATHS = ${renderArray(nullablePaths)} as const;`,
    `export type ${prefix}_NULLABLE_PATH =\n  (typeof ${prefix}_NULLABLE_PATHS)[number];`,
    "",
  ].join("\n");
}

export function renderResultContractTs(
  docSpec: ProjectionSpec,
  companySpec: ProjectionSpec,
): string {
  const docGroups = groupByObject(docSpec.fields);
  const companyGroups = groupByObject(companySpec.fields);
  const definedInterfaces = new Set<string>();

  const lines = [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/doc-projection.json + contracts/engine/company-projection.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "",
  ];

  // Generate interfaces for doc projection
  for (const { objectName, fields } of docGroups) {
    const typeName = infoTypeName(objectName);
    if (definedInterfaces.has(typeName)) continue;
    definedInterfaces.add(typeName);
    lines.push(`export interface ${typeName} {`);
    for (const field of fields) {
      lines.push(`  ${fieldProp(field)}: ${tsFieldType(field)};`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate DocumentRow
  lines.push("export interface DocumentRow {");
  for (const { objectName } of docGroups) {
    const container = infoTypeName(objectName);
    const tsType = NULLABLE_OBJECTS.has(objectName)
      ? `${container} | null`
      : container;
    lines.push(`  ${objectName}: ${tsType};`);
  }
  lines.push("}");
  lines.push("");

  // Generate interfaces for company projection (skip already defined)
  for (const { objectName, fields } of companyGroups) {
    const typeName = infoTypeName(objectName);
    if (definedInterfaces.has(typeName)) continue;
    definedInterfaces.add(typeName);
    lines.push(`export interface ${typeName} {`);
    for (const field of fields) {
      lines.push(`  ${fieldProp(field)}: ${tsFieldType(field)};`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate CompanyRow
  lines.push("export interface CompanyRow {");
  for (const { objectName } of companyGroups) {
    const container = infoTypeName(objectName);
    const tsType = NULLABLE_OBJECTS.has(objectName)
      ? `${container} | null`
      : container;
    lines.push(`  ${objectName}: ${tsType};`);
  }
  lines.push("}");
  lines.push("");

  // Discriminated union
  lines.push("export type SearchResult =");
  lines.push('  | ({ kind: "document" } & DocumentRow)');
  lines.push('  | ({ kind: "company" } & CompanyRow);');
  lines.push("");

  lines.push("export interface SearchResponse {");
  lines.push("  results: SearchResult[];");
  lines.push("  count: number;");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function tsFieldType(field: ProjectionField): string {
  if (field.value_type === "string_array") {
    return field.nullable ? "string[] | null" : "string[]";
  }
  if (field.value_type === "integer") {
    return field.nullable ? "number | null" : "number";
  }
  return field.nullable ? "string | null" : "string";
}
