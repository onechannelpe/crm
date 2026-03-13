type ProjectionField = {
  path: string;
  canonical_fields: string[];
  nullable?: boolean;
  value_type?: "string" | "string_array";
  storage: ProjectionStorage[];
};

type ProjectionStorage = {
  table: string;
  column: string;
};

type ProjectionContract = {
  projection: string;
  fields: ProjectionField[];
};

const SPEC_PATH = "contracts/search-projection.json";
const TS_OUT = "apps/web/src/server/shared/engine/projection-contract.ts";
const RUST_OUT =
  "crates/engine/src/storage/sqlite/projection_contract_generated.rs";
const TS_RESULT_OUT = "apps/web/src/server/shared/engine/result-contract.ts";
const RUST_RESULT_OUT =
  "crates/engine/src/storage/sqlite/result_contract_generated.rs";
const NULLABLE_OBJECTS = new Set(["org", "role"]);

function parseSpec(input: unknown): ProjectionContract {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("search projection contract must be an object");
  }

  const root = input as Record<string, unknown>;
  if (typeof root.projection !== "string") {
    throw new Error("projection must be a string");
  }
  if (!Array.isArray(root.fields)) {
    throw new Error("fields must be an array");
  }

  const fields = root.fields.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`fields[${index}] must be an object`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.path !== "string") {
      throw new Error(`fields[${index}].path must be a string`);
    }
    if (
      !Array.isArray(row.canonical_fields) ||
      !row.canonical_fields.every((value) => typeof value === "string")
    ) {
      throw new Error(`fields[${index}].canonical_fields must be string[]`);
    }

    const nullable = row.nullable;
    if (nullable !== undefined && typeof nullable !== "boolean") {
      throw new Error(
        `fields[${index}].nullable must be boolean when provided`,
      );
    }
    const value_type = row.value_type;
    if (
      value_type !== undefined &&
      value_type !== "string" &&
      value_type !== "string_array"
    ) {
      throw new Error(
        `fields[${index}].value_type must be "string" | "string_array" when provided`,
      );
    }

    if (!Array.isArray(row.storage) || row.storage.length === 0) {
      throw new Error(`fields[${index}].storage must be a non-empty array`);
    }
    const storage = row.storage.map((entry, storageIndex) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw new Error(
          `fields[${index}].storage[${storageIndex}] must be an object`,
        );
      }
      const storageRow = entry as Record<string, unknown>;
      const table = storageRow.table;
      const column = storageRow.column;
      if (typeof table !== "string" || table.trim().length === 0) {
        throw new Error(
          `fields[${index}].storage[${storageIndex}].table must be a non-empty string`,
        );
      }
      if (typeof column !== "string" || column.trim().length === 0) {
        throw new Error(
          `fields[${index}].storage[${storageIndex}].column must be a non-empty string`,
        );
      }
      return { table, column } satisfies ProjectionStorage;
    });

    return {
      path: row.path,
      canonical_fields: row.canonical_fields,
      nullable,
      value_type,
      storage,
    } satisfies ProjectionField;
  });

  return {
    projection: root.projection,
    fields,
  };
}

function renderTs(spec: ProjectionContract): string {
  const paths = spec.fields.map((field) => field.path);
  const nullablePaths = spec.fields
    .filter((field) => field.nullable === true)
    .map((field) => field.path);

  const renderArray = (values: readonly string[]): string =>
    `[\n${values.map((value) => `  ${JSON.stringify(value)},`).join("\n")}\n]`;

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `export const SEARCH_PROJECTION_NAME = ${JSON.stringify(spec.projection)} as const;`,
    `export const SEARCH_PROJECTION_PATHS = ${renderArray(paths)} as const;`,
    "export type SearchProjectionPath = (typeof SEARCH_PROJECTION_PATHS)[number];",
    `export const SEARCH_PROJECTION_NULLABLE_PATHS = ${renderArray(nullablePaths)} as const;`,
    "export type SearchProjectionNullablePath =",
    "  (typeof SEARCH_PROJECTION_NULLABLE_PATHS)[number];",
    "",
  ].join("\n");
}

function renderRust(spec: ProjectionContract): string {
  const nullablePaths = spec.fields
    .filter((field) => field.nullable === true)
    .map((field) => field.path);

  const paths = spec.fields.map((field) => field.path);
  const mappings = spec.fields.flatMap((field) =>
    field.storage.map((storage) => ({
      path: field.path,
      table: storage.table,
      column: storage.column,
    })),
  );

  const renderArray = (values: readonly string[], indent = "    "): string =>
    values.map((value) => `${indent}${JSON.stringify(value)},`).join("\n");

  const renderMappings = (): string =>
    mappings
      .map((mapping) =>
        [
          "    ProjectionStorageMapping {",
          `        path: ${JSON.stringify(mapping.path)},`,
          `        table: ${JSON.stringify(mapping.table)},`,
          `        column: ${JSON.stringify(mapping.column)},`,
          "    },",
        ].join("\n"),
      )
      .join("\n");

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    "pub struct ProjectionStorageMapping {",
    "    pub path: &'static str,",
    "    pub table: &'static str,",
    "    pub column: &'static str,",
    "}",
    "",
    `pub const SEARCH_PROJECTION_NAME: &str = ${JSON.stringify(spec.projection)};`,
    "pub const SEARCH_PROJECTION_PATHS: &[&str] = &[",
    renderArray(paths),
    "];",
    "pub const SEARCH_PROJECTION_NULLABLE_PATHS: &[&str] = &[",
    renderArray(nullablePaths),
    "];",
    "pub const SEARCH_PROJECTION_STORAGE_MAPPINGS: &[ProjectionStorageMapping] = &[",
    renderMappings(),
    "];",
    "",
  ].join("\n");
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("");
}

function groupFieldsByObject(
  spec: ProjectionContract,
): Map<string, ProjectionField[]> {
  const groups = new Map<string, ProjectionField[]>();
  for (const field of spec.fields) {
    const dot = field.path.indexOf(".");
    if (dot <= 0 || dot === field.path.length - 1) {
      throw new Error(
        `projection field path must follow object.property format: ${field.path}`,
      );
    }
    const objectName = field.path.slice(0, dot);
    const list = groups.get(objectName);
    if (list) {
      list.push(field);
    } else {
      groups.set(objectName, [field]);
    }
  }
  return groups;
}

function orderedObjects(groups: Map<string, ProjectionField[]>): string[] {
  const preferred = ["person", "org", "role", "phones"];
  const discovered = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const out: string[] = [];
  for (const key of preferred) {
    if (groups.has(key)) out.push(key);
  }
  for (const key of discovered) {
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function infoTypeName(objectName: string): string {
  if (objectName === "org") return "OrgInfo";
  if (objectName === "phones") return "PhoneInfo";
  return `${pascalCase(objectName)}Info`;
}

function fieldTsType(field: ProjectionField): string {
  if (field.value_type === "string_array") {
    return field.nullable === true ? "string[] | null" : "string[]";
  }
  return field.nullable === true ? "string | null" : "string";
}

function fieldRustType(field: ProjectionField): string {
  if (field.value_type === "string_array") {
    return field.nullable === true ? "Option<Vec<String>>" : "Vec<String>";
  }
  return field.nullable === true ? "Option<String>" : "String";
}

function renderResultTs(spec: ProjectionContract): string {
  const groups = groupFieldsByObject(spec);
  const objects = orderedObjects(groups);

  const lines = ["// GENERATED FILE. DO NOT EDIT."];

  for (const objectName of objects) {
    const fields = groups.get(objectName) ?? [];
    lines.push(`export interface ${infoTypeName(objectName)} {`);
    for (const field of fields) {
      const prop = field.path.slice(field.path.indexOf(".") + 1);
      const tsType = fieldTsType(field);
      lines.push(`  ${prop}: ${tsType};`);
    }
    lines.push("}");
    lines.push("");
  }

  lines.push("export interface SearchResult {");
  for (const objectName of objects) {
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

function renderResultRust(spec: ProjectionContract): string {
  const groups = groupFieldsByObject(spec);
  const objects = orderedObjects(groups);

  const lines = [
    "// GENERATED FILE. DO NOT EDIT.",
    "use serde::Serialize;",
    "",
  ];

  for (const objectName of objects) {
    const fields = groups.get(objectName) ?? [];
    lines.push("#[derive(Debug, Serialize)]");
    lines.push(`pub struct ${infoTypeName(objectName)} {`);
    for (const field of fields) {
      const prop = field.path.slice(field.path.indexOf(".") + 1);
      const rustType = fieldRustType(field);
      lines.push(`    pub ${prop}: ${rustType},`);
    }
    lines.push("}");
    lines.push("");
  }

  lines.push("#[derive(Debug, Serialize)]");
  lines.push("pub struct SearchRow {");
  for (const objectName of objects) {
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

async function writeOrCheck(
  path: string,
  content: string,
  check: boolean,
): Promise<void> {
  if (check) {
    let existing = "";
    try {
      existing = await Bun.file(path).text();
    } catch {
      existing = "";
    }

    if (existing.trimEnd() !== content.trimEnd()) {
      throw new Error(`${path} is out of date`);
    }
    return;
  }

  await Bun.write(path, content);
}

const check = Bun.argv.includes("--check");
const raw = (await Bun.file(SPEC_PATH).json()) as unknown;
const spec = parseSpec(raw);
await writeOrCheck(TS_OUT, renderTs(spec), check);
await writeOrCheck(RUST_OUT, renderRust(spec), check);
await writeOrCheck(TS_RESULT_OUT, renderResultTs(spec), check);
await writeOrCheck(RUST_RESULT_OUT, renderResultRust(spec), check);
console.log(
  check
    ? "search projection contract artifacts are up to date"
    : "search projection contract artifacts generated",
);
