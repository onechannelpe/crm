import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
  type ObjectGroup,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

// TS consumers only need the path list (server/shared/engine/validation.ts reads it).
// The Rust projection contract emits more for its schema guard; TS does not.
export function renderProjectionContractTs(
  spec: ProjectionSpec,
  prefix: string,
  sourceFile: string,
): string {
  const allPaths = spec.fields.map((f) => f.path);
  const renderArray = (values: string[]): string =>
    `[\n${values.map((v) => `  ${JSON.stringify(v)},`).join("\n")}\n]`;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `// Source: ${sourceFile}`,
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    `export const ${prefix}_PATHS = ${renderArray(allPaths)} as const;`,
    "",
  ].join("\n");
}

export function renderResultContractTs(
  docSpec: ProjectionSpec,
  companySpec: ProjectionSpec,
): string {
  const docGroups = groupByObject(docSpec.fields);
  const companyGroups = groupByObject(companySpec.fields);
  // Doc and company projections share object types. Track what we have emitted
  // so the second projection does not redefine them.
  const defined = new Set<string>();

  const lines = [
    "// GENERATED FILE. DO NOT EDIT BY HAND.",
    "// Source: contracts/engine/doc-projection.json + contracts/engine/company-projection.json",
    "// Generator: tools/codegen/bin/generate.ts",
    "",
    ...emitInfoInterfaces(docGroups, defined),
    ...emitRow("DocumentRow", docGroups),
    ...emitInfoInterfaces(companyGroups, defined),
    ...emitRow("CompanyRow", companyGroups),
  ];

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

function emitInfoInterfaces(
  groups: ObjectGroup[],
  defined: Set<string>,
): string[] {
  const lines: string[] = [];
  for (const { objectName, fields } of groups) {
    const typeName = infoTypeName(objectName);
    if (defined.has(typeName)) continue;
    defined.add(typeName);
    lines.push(`export interface ${typeName} {`);
    for (const field of fields) {
      lines.push(`  ${fieldProp(field)}: ${tsFieldType(field)};`);
    }
    lines.push("}", "");
  }
  return lines;
}

function emitRow(name: string, groups: ObjectGroup[]): string[] {
  const lines = [`export interface ${name} {`];
  for (const { objectName } of groups) {
    const container = infoTypeName(objectName);
    const tsType = NULLABLE_OBJECTS.has(objectName)
      ? `${container} | null`
      : container;
    lines.push(`  ${objectName}: ${tsType};`);
  }
  lines.push("}", "");
  return lines;
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
