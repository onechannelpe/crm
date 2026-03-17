type FieldType = "string" | "i32" | "i64";

type FieldSpec = {
  name: string;
  type: FieldType;
  optional?: boolean;
};

type StructSpec = {
  fields: FieldSpec[];
};

type LeadApiSpec = {
  response: {
    candidate: StructSpec;
  };
  request: {
    import_row: StructSpec;
  };
};

const SPEC_PATH = "contracts/engine/lead-api.json";
const RUST_OUT = "crates/lead-service/src/contracts_generated.rs";
const TS_OUT = "apps/web/src/server/shared/engine/lead-contract.ts";

function parseSpec(raw: unknown): LeadApiSpec {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("lead-api spec must be an object");
  }
  const root = raw as Record<string, unknown>;

  const response = root.response;
  if (
    typeof response !== "object" ||
    response === null ||
    Array.isArray(response)
  ) {
    throw new Error("response must be an object");
  }
  const responseObj = response as Record<string, unknown>;
  const candidate = responseObj.candidate;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    throw new Error("response.candidate must be an object");
  }

  const request = root.request;
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new Error("request must be an object");
  }
  const requestObj = request as Record<string, unknown>;
  const import_row = requestObj.import_row;
  if (
    typeof import_row !== "object" ||
    import_row === null ||
    Array.isArray(import_row)
  ) {
    throw new Error("request.import_row must be an object");
  }

  return {
    response: { candidate: parseStruct(candidate, "response.candidate") },
    request: { import_row: parseStruct(import_row, "request.import_row") },
  };
}

function parseStruct(raw: unknown, label: string): StructSpec {
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.fields)) {
    throw new Error(`${label}.fields must be an array`);
  }
  const fields = obj.fields.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`${label}.fields[${index}] must be an object`);
    }
    const field = item as Record<string, unknown>;
    if (typeof field.name !== "string") {
      throw new Error(`${label}.fields[${index}].name must be a string`);
    }
    if (
      field.type !== "string" &&
      field.type !== "i32" &&
      field.type !== "i64"
    ) {
      throw new Error(
        `${label}.fields[${index}].type must be string | i32 | i64`,
      );
    }
    const optional = field.optional;
    if (optional !== undefined && typeof optional !== "boolean") {
      throw new Error(
        `${label}.fields[${index}].optional must be boolean when provided`,
      );
    }
    return {
      name: field.name,
      type: field.type as FieldType,
      optional: optional === true,
    };
  });
  return { fields };
}

function rustType(field: FieldSpec): string {
  const base =
    field.type === "string" ? "String" : field.type === "i32" ? "i32" : "i64";
  return field.optional ? `Option<${base}>` : base;
}

function tsType(field: FieldSpec): string {
  const base = field.type === "string" ? "string" : "number";
  return field.optional ? `${base} | undefined` : base;
}

function renderRust(spec: LeadApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  const lines: string[] = [
    "// GENERATED FILE. DO NOT EDIT.",
    "use serde::{Deserialize, Serialize};",
    "",
    "#[derive(Debug, Serialize, Clone)]",
    "pub struct LeadCandidate {",
    ...candidateFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct LeadCandidatesResponse {",
    "    pub candidates: Vec<LeadCandidate>,",
    "    pub count: usize,",
    "}",
    "",
    "#[derive(Debug, Deserialize, Clone)]",
    "pub struct LeadImportRow {",
    ...importRowFields.map((f) => `    pub ${f.name}: ${rustType(f)},`),
    "}",
    "",
    "#[derive(Debug, Deserialize)]",
    "pub struct LeadImportRequest {",
    "    pub rows: Vec<LeadImportRow>,",
    "    pub source: String,",
    "}",
    "",
    "#[derive(Debug, Serialize)]",
    "pub struct LeadImportResponse {",
    "    pub inserted: usize,",
    "    pub updated: usize,",
    "    pub skipped: usize,",
    "    pub total: usize,",
    "}",
    "",
  ];

  return lines.join("\n");
}

function renderTs(spec: LeadApiSpec): string {
  const candidateFields = spec.response.candidate.fields;
  const importRowFields = spec.request.import_row.fields;

  const candidateProps = candidateFields
    .map((f) => `  ${f.name}: ${tsType(f)};`)
    .join(" ");
  const importRowProps = importRowFields
    .map((f) => {
      const key = f.optional ? `${f.name}?` : f.name;
      const base = f.type === "string" ? "string" : "number";
      return `  ${key}: ${base};`;
    })
    .join(" ");

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `export interface LeadCandidate { ${candidateProps} }`,
    "export interface LeadCandidatesResponse { candidates: LeadCandidate[]; count: number; }",
    `export interface LeadImportRow { ${importRowProps} }`,
    "export interface LeadImportRequest { rows: LeadImportRow[]; source: string; }",
    "export interface LeadImportResponse { inserted: number; updated: number; skipped: number; total: number; }",
    "",
  ].join("\n");
}

async function writeOrCheck(
  path: string,
  content: string,
  check: boolean,
): Promise<void> {
  if (!check) {
    await Bun.write(path, content);
    return;
  }
  let existing = "";
  try {
    existing = await Bun.file(path).text();
  } catch {
    existing = "";
  }
  if (existing.trimEnd() !== content.trimEnd()) {
    throw new Error(`${path} is out of date`);
  }
}

const check = Bun.argv.includes("--check");
const raw = (await Bun.file(SPEC_PATH).json()) as unknown;
const spec = parseSpec(raw);
await writeOrCheck(RUST_OUT, renderRust(spec), check);
await writeOrCheck(TS_OUT, renderTs(spec), check);
console.log(
  check
    ? "lead contract artifacts are up to date"
    : "lead contract artifacts generated",
);
