import {
  fieldProp,
  groupByObject,
  infoTypeName,
  NULLABLE_OBJECTS,
  type ObjectGroup,
} from "./group.ts";
import type { ProjectionField, ProjectionSpec } from "./parse.ts";

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
    "// GENERATED FILE. DO NOT EDIT.",
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
