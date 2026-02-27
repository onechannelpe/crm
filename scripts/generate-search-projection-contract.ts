type ProjectionField = {
  path: string;
  canonical_fields: string[];
  nullable?: boolean;
};

type ProjectionContract = {
  projection: string;
  fields: ProjectionField[];
};

const SPEC_PATH = "contracts/search-projection.json";
const TS_OUT = "apps/web/src/server/shared/engine/projection-contract.ts";

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

    return {
      path: row.path,
      canonical_fields: row.canonical_fields,
      nullable,
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
console.log(
  check
    ? "search projection contract is up to date"
    : "search projection contract generated",
);
