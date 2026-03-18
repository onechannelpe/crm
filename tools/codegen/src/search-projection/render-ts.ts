import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

export function renderProjectionContractTs(spec: ProjectionSpec): string {
  const allPaths = spec.fields.map((f) => f.path);
  const nullablePaths = spec.fields
    .filter((f) => f.nullable)
    .map((f) => f.path);

  const renderArray = (values: string[]): string =>
    `[\n${values.map((v) => `  ${JSON.stringify(v)},`).join("\n")}\n]`;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/search-projection.json",
    "// Generator: tools/codegen/bin/generate-search-projection-contract.ts",
    "",
    `export const SEARCH_PROJECTION_NAME = ${JSON.stringify(spec.projection)} as const;`,
    `export const SEARCH_PROJECTION_PATHS = ${renderArray(allPaths)} as const;`,
    "export type SearchProjectionPath = (typeof SEARCH_PROJECTION_PATHS)[number];",
    "",
    `export const SEARCH_PROJECTION_NULLABLE_PATHS = ${renderArray(nullablePaths)} as const;`,
    "export type SearchProjectionNullablePath =\n  (typeof SEARCH_PROJECTION_NULLABLE_PATHS)[number];",
    "",
  ].join("\n");
}

export function renderResultContractTs(spec: ProjectionSpec): string {
  const groups = groupByObject(spec.fields);

  const lines = [
    "// GENERATED FILE. DO NOT EDIT.",
    "// Source: contracts/engine/search-projection.json",
    "// Generator: tools/codegen/bin/generate-search-projection-contract.ts",
    "",
  ];

  for (const { objectName, fields } of groups) {
    lines.push(`export interface ${infoTypeName(objectName)} {`);
    for (const field of fields) {
      lines.push(`  ${fieldProp(field)}: ${tsFieldType(field)};`);
    }
    lines.push("}");
    lines.push("");
  }

  lines.push("export interface SearchResult {");
  for (const { objectName } of groups) {
    const container = infoTypeName(objectName);
    const tsType = NULLABLE_OBJECTS.has(objectName)
      ? `${container} | null`
      : container;
    lines.push(`  ${objectName}: ${tsType};`);
  }
  lines.push("}");
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
  return field.nullable ? "string | null" : "string";
}
