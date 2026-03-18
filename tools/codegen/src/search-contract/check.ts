import type { ProjectionSpec } from "../search-projection/parse.ts";
import type {
  CanonicalContract,
  SourceContract,
  SourceManifest,
  SourceMapping,
} from "./parse.ts";

export type LoadedSource = {
  entry: SourceManifest["sources"][number];
  mapping: SourceMapping;
};

export type CheckResult =
  | { ok: true; summary: string }
  | { ok: false; errors: string[] };

/**
 * Validates the full search contract:
 *  1. Every enabled source has a source-contract entry.
 *  2. Every required canonical field is present in the source mapping.
 *  3. Sources that require phone input have at least one phone mapping.
 *  4. Every projection field references only known canonical fields.
 *  5. Every non-derived projection field is backed by at least one enabled source.
 *
 * Pure function — all I/O happens in the bin entry point.
 */
export function checkSearchContract(
  canonical: CanonicalContract,
  source: SourceContract,
  projection: ProjectionSpec,
  loaded: LoadedSource[],
): CheckResult {
  const errors: string[] = [];
  const canonicalSet = new Set(canonical.fields);
  const contractByKey = new Map(source.sources.map((s) => [s.source_key, s]));
  const mappedByEnabled = new Set<string>();

  for (const { entry, mapping } of loaded) {
    const contract = contractByKey.get(entry.source_key);
    if (!contract) {
      errors.push(
        `missing source contract entry for enabled source: ${entry.source_key}`,
      );
      continue;
    }

    // Validate all mapped field keys are canonical.
    for (const key of Object.keys(mapping.fields)) {
      if (!canonicalSet.has(key)) {
        errors.push(
          `mapping ${entry.mapping_path} uses non-canonical field: ${key}`,
        );
      } else if (mapping.fields[key]!.trim().length > 0) {
        mappedByEnabled.add(key);
      }
    }

    // Validate required fields are actually present in the mapping.
    for (const required of contract.required_canonical_fields) {
      if (!canonicalSet.has(required)) {
        errors.push(
          `source contract ${entry.source_key} requires unknown canonical field: ${required}`,
        );
        continue;
      }
      const value = mapping.fields[required];
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(
          `source ${entry.source_key} is missing required mapping for: ${required}`,
        );
      }
    }

    // Validate phone input requirement.
    if (contract.requires_any_phone_input) {
      const hasPhone =
        (typeof mapping.fields["phone"] === "string" &&
          mapping.fields["phone"]!.trim().length > 0) ||
        mapping.phone_columns.length > 0 ||
        mapping.phone_prefixes.length > 0;

      if (!hasPhone) {
        errors.push(
          `source ${entry.source_key} requires phone input but mapping has none`,
        );
      } else {
        mappedByEnabled.add("phone");
      }
    }
  }

  // Validate projection fields against canonical and enabled mappings.
  for (const field of projection.fields) {
    if (field.canonical_fields.length === 0) {
      errors.push(`projection field ${field.path} has empty canonical_fields`);
      continue;
    }
    for (const canonical_field of field.canonical_fields) {
      if (!canonicalSet.has(canonical_field)) {
        errors.push(
          `projection field ${field.path} references unknown canonical field: ${canonical_field}`,
        );
        continue;
      }
      if (!field.derivation && !mappedByEnabled.has(canonical_field)) {
        errors.push(
          `projection field ${field.path} is not backed by any enabled source mapping: ${canonical_field}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const summary = [
    `search contract OK:`,
    `${loaded.length} enabled sources,`,
    `${mappedByEnabled.size} mapped canonical fields,`,
    `${projection.fields.length} projection fields`,
  ].join(" ");

  return { ok: true, summary };
}
