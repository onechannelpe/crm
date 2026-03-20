import { asObject, asString, asStringArray } from "../shared.ts";

export type ValueType = "string" | "string_array";

export type StorageMapping = {
  table: string;
  column: string;
};

export type ProjectionField = {
  path: string;
  canonical_fields: string[];
  nullable: boolean;
  value_type: ValueType;
  derivation: string | undefined;
  storage: StorageMapping[];
};

export type ProjectionSpec = {
  projection: string;
  fields: ProjectionField[];
};

const VALID_VALUE_TYPES = new Set<string>(["string", "string_array"]);

export function parseProjectionSpec(raw: unknown): ProjectionSpec {
  const root = asObject(raw, "projection spec");
  const projection = asString(root["projection"], "projection");

  if (!Array.isArray(root["fields"])) {
    throw new Error("fields must be an array");
  }

  const fields: ProjectionField[] = (root["fields"] as unknown[]).map(
    (item, i) => {
      const field = asObject(item, `fields[${i}]`);
      const path = asString(field["path"], `fields[${i}].path`);
      const canonical_fields = asStringArray(
        field["canonical_fields"],
        `fields[${i}].canonical_fields`,
      );

      const nullableRaw = field["nullable"];
      if (nullableRaw !== undefined && typeof nullableRaw !== "boolean") {
        throw new Error(`fields[${i}].nullable must be boolean when present`);
      }

      const valueTypeRaw = field["value_type"];
      if (
        valueTypeRaw !== undefined &&
        !VALID_VALUE_TYPES.has(valueTypeRaw as string)
      ) {
        throw new Error(
          `fields[${i}].value_type must be "string" | "string_array" when present`,
        );
      }

      if (
        !Array.isArray(field["storage"]) ||
        (field["storage"] as unknown[]).length === 0
      ) {
        throw new Error(`fields[${i}].storage must be a non-empty array`);
      }

      const storage: StorageMapping[] = (field["storage"] as unknown[]).map(
        (entry, si) => {
          const s = asObject(entry, `fields[${i}].storage[${si}]`);
          const table = asString(
            s["table"],
            `fields[${i}].storage[${si}].table`,
          );
          const column = asString(
            s["column"],
            `fields[${i}].storage[${si}].column`,
          );
          if (table.trim().length === 0)
            throw new Error(
              `fields[${i}].storage[${si}].table must be non-empty`,
            );
          if (column.trim().length === 0)
            throw new Error(
              `fields[${i}].storage[${si}].column must be non-empty`,
            );
          return { table, column };
        },
      );

      const derivationRaw = field["derivation"];

      return {
        path,
        canonical_fields,
        nullable: nullableRaw === true,
        value_type: (valueTypeRaw as ValueType | undefined) ?? "string",
        derivation:
          typeof derivationRaw === "string" ? derivationRaw : undefined,
        storage,
      };
    },
  );

  return { projection, fields };
}
