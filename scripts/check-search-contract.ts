interface SourceManifestEntry {
  source_key: string;
  mapping_path: string;
  enabled: boolean;
}

interface SourceManifest {
  sources: SourceManifestEntry[];
}

interface SourceMapping {
  fields?: Record<string, string>;
  phone_columns?: string[];
  phone_prefixes?: string[];
}

interface CanonicalContract {
  fields: string[];
}

interface SourceContractEntry {
  source_key: string;
  required_canonical_fields: string[];
  requires_any_phone_input?: boolean;
}

interface SourceContract {
  sources: SourceContractEntry[];
}

interface ProjectionField {
  path: string;
  canonical_fields: string[];
  derivation?: string;
  storage: ProjectionStorage[];
}

interface ProjectionStorage {
  table: string;
  column: string;
}

interface ProjectionContract {
  projection: string;
  fields: ProjectionField[];
}

const MANIFEST_PATH = "apps/pipeline/data/mappings/source-manifest.json";
const CANONICAL_CONTRACT_PATH = "contracts/canonical-contract.json";
const SOURCE_CONTRACT_PATH = "contracts/source-contract.json";
const PROJECTION_CONTRACT_PATH = "contracts/search-projection.json";

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${label} must be string[]`);
  }
  return value;
}

async function loadJson(path: string): Promise<unknown> {
  return (await Bun.file(path).json()) as unknown;
}

function parseManifest(input: unknown): SourceManifest {
  const root = asObject(input, "manifest");
  const sourcesRaw = root.sources;
  if (!Array.isArray(sourcesRaw)) {
    throw new Error("manifest.sources must be an array");
  }

  const sources = sourcesRaw.map((item, index) => {
    const row = asObject(item, `manifest.sources[${index}]`);
    const source_key = row.source_key;
    const mapping_path = row.mapping_path;
    const enabled = row.enabled;

    if (typeof source_key !== "string" || typeof mapping_path !== "string") {
      throw new Error(
        `manifest.sources[${index}] missing source_key/mapping_path`,
      );
    }
    if (typeof enabled !== "boolean") {
      throw new Error(`manifest.sources[${index}] missing enabled flag`);
    }

    return { source_key, mapping_path, enabled };
  });

  return { sources };
}

function parseCanonicalContract(input: unknown): CanonicalContract {
  const root = asObject(input, "canonical contract");
  const fields = asStringArray(root.fields, "canonical contract fields");
  return { fields };
}

function parseSourceContract(input: unknown): SourceContract {
  const root = asObject(input, "source contract");
  const sourcesRaw = root.sources;
  if (!Array.isArray(sourcesRaw)) {
    throw new Error("source contract sources must be an array");
  }

  const sources = sourcesRaw.map((item, index) => {
    const row = asObject(item, `source contract sources[${index}]`);
    const source_key = row.source_key;
    const required_canonical_fields = asStringArray(
      row.required_canonical_fields,
      `source contract ${index} required fields`,
    );
    const requires_any_phone_input = row.requires_any_phone_input;

    if (typeof source_key !== "string") {
      throw new Error(`source contract sources[${index}] missing source_key`);
    }
    if (
      requires_any_phone_input !== undefined &&
      typeof requires_any_phone_input !== "boolean"
    ) {
      throw new Error(
        `source contract sources[${index}] requires_any_phone_input must be boolean`,
      );
    }

    return {
      source_key,
      required_canonical_fields,
      requires_any_phone_input,
    };
  });

  return { sources };
}

function parseProjectionContract(input: unknown): ProjectionContract {
  const root = asObject(input, "projection contract");
  const projection = root.projection;
  const fieldsRaw = root.fields;

  if (typeof projection !== "string") {
    throw new Error("projection contract projection must be a string");
  }
  if (!Array.isArray(fieldsRaw)) {
    throw new Error("projection contract fields must be an array");
  }

  const fields = fieldsRaw.map((item, index) => {
    const row = asObject(item, `projection contract fields[${index}]`);
    const path = row.path;
    const canonical_fields = asStringArray(
      row.canonical_fields,
      `projection field ${index} canonical_fields`,
    );
    const storageRaw = row.storage;
    if (!Array.isArray(storageRaw) || storageRaw.length === 0) {
      throw new Error(`projection contract fields[${index}] missing storage[]`);
    }
    const storage = storageRaw.map((entry, storageIndex) => {
      const storageRow = asObject(
        entry,
        `projection field ${index} storage[${storageIndex}]`,
      );
      const table = storageRow.table;
      const column = storageRow.column;
      if (typeof table !== "string" || table.trim().length === 0) {
        throw new Error(
          `projection contract fields[${index}] storage[${storageIndex}].table must be a non-empty string`,
        );
      }
      if (typeof column !== "string" || column.trim().length === 0) {
        throw new Error(
          `projection contract fields[${index}] storage[${storageIndex}].column must be a non-empty string`,
        );
      }
      return { table, column } satisfies ProjectionStorage;
    });
    if (typeof path !== "string") {
      throw new Error(`projection contract fields[${index}] missing path`);
    }
    const derivation =
      typeof row.derivation === "string" ? row.derivation : undefined;
    return { path, canonical_fields, derivation, storage };
  });

  return { projection, fields };
}

async function main(): Promise<void> {
  const manifest = parseManifest(await loadJson(MANIFEST_PATH));
  const canonicalContract = parseCanonicalContract(
    await loadJson(CANONICAL_CONTRACT_PATH),
  );
  const sourceContract = parseSourceContract(
    await loadJson(SOURCE_CONTRACT_PATH),
  );
  const projectionContract = parseProjectionContract(
    await loadJson(PROJECTION_CONTRACT_PATH),
  );

  const canonicalFieldSet = new Set(canonicalContract.fields);
  const sourceContractByKey = new Map(
    sourceContract.sources.map((source) => [source.source_key, source]),
  );

  const errors: string[] = [];
  const mappedByEnabledSources = new Set<string>();
  const enabledSources = manifest.sources.filter((source) => source.enabled);

  const loadedMappings = await Promise.all(
    enabledSources.map(async (source) => ({
      source,
      mappingJson: (await loadJson(source.mapping_path)) as SourceMapping,
    })),
  );

  for (const item of loadedMappings) {
    const source = item.source;
    const contractEntry = sourceContractByKey.get(source.source_key);
    if (!contractEntry) {
      errors.push(
        `missing source contract entry for enabled source: ${source.source_key}`,
      );
      continue;
    }

    const mappingJson = item.mappingJson;
    const fields = mappingJson.fields ?? {};
    const phoneColumns = mappingJson.phone_columns ?? [];
    const phonePrefixes = mappingJson.phone_prefixes ?? [];

    for (const key of Object.keys(fields)) {
      if (!canonicalFieldSet.has(key)) {
        errors.push(
          `mapping ${source.mapping_path} uses non-canonical field key: ${key}`,
        );
      }
      const rawValue = fields[key];
      if (typeof rawValue !== "string") {
        errors.push(
          `mapping ${source.mapping_path} field ${key} must map to a string`,
        );
        continue;
      }
      if (rawValue.trim().length > 0) {
        mappedByEnabledSources.add(key);
      }
    }

    for (const requiredField of contractEntry.required_canonical_fields) {
      if (!canonicalFieldSet.has(requiredField)) {
        errors.push(
          `source contract ${source.source_key} requires unknown canonical field: ${requiredField}`,
        );
        continue;
      }

      const mappingValue = fields[requiredField];
      if (
        typeof mappingValue !== "string" ||
        mappingValue.trim().length === 0
      ) {
        errors.push(
          `source ${source.source_key} is missing required mapping field: ${requiredField}`,
        );
      }
    }

    if (contractEntry.requires_any_phone_input) {
      const hasDirectPhone =
        typeof fields.phone === "string" && fields.phone.trim().length > 0;
      const hasPhoneColumns = phoneColumns.length > 0;
      const hasPhonePrefixes = phonePrefixes.length > 0;

      if (!hasDirectPhone && !hasPhoneColumns && !hasPhonePrefixes) {
        errors.push(
          `source ${source.source_key} requires phone input but mapping has no phone field/columns/prefixes`,
        );
      }
      if (hasDirectPhone || hasPhoneColumns || hasPhonePrefixes) {
        mappedByEnabledSources.add("phone");
      }
    }
  }

  for (const field of projectionContract.fields) {
    if (field.canonical_fields.length === 0) {
      errors.push(`projection field ${field.path} has empty canonical_fields`);
      continue;
    }

    for (const canonicalField of field.canonical_fields) {
      if (!canonicalFieldSet.has(canonicalField)) {
        errors.push(
          `projection field ${field.path} references unknown canonical field: ${canonicalField}`,
        );
        continue;
      }
      if (!field.derivation && !mappedByEnabledSources.has(canonicalField)) {
        errors.push(
          `projection field ${field.path} is not backed by enabled source mappings: ${canonicalField}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log(
    `search contract OK: ${enabledSources.length} sources, ${mappedByEnabledSources.size} mapped fields, ${projectionContract.fields.length} projection fields`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }
  console.error("unknown error");
  process.exit(1);
});
