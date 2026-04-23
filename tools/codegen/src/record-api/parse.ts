import { asObject, asString } from "../shared.ts";

export type FieldType = "string" | "i32" | "i64";

export type FieldSpec = {
  name: string;
  type: FieldType;
  optional: boolean;
};

export type StructSpec = {
  fields: FieldSpec[];
};

export type RecordApiSpec = {
  response: { candidate: StructSpec };
  request: { import_row: StructSpec };
};

const VALID_FIELD_TYPES = new Set(["string", "i32", "i64"]);

export function parseRecordApiSpec(raw: unknown): RecordApiSpec {
  const root = asObject(raw, "record-api spec");

  return {
    response: {
      candidate: parseStruct(
        asObject(
          asObject(root["response"], "response")["candidate"],
          "response.candidate",
        ),
      ),
    },
    request: {
      import_row: parseStruct(
        asObject(
          asObject(root["request"], "request")["import_row"],
          "request.import_row",
        ),
      ),
    },
  };
}

function parseStruct(raw: Record<string, unknown>): StructSpec {
  const fieldsRaw = raw["fields"];
  if (!Array.isArray(fieldsRaw)) {
    throw new Error("struct.fields must be an array");
  }

  const fields: FieldSpec[] = fieldsRaw.map((item, i) => {
    const field = asObject(item, `fields[${i}]`);
    const name = asString(field["name"], `fields[${i}].name`);
    const type = asString(field["type"], `fields[${i}].type`);

    if (!VALID_FIELD_TYPES.has(type)) {
      throw new Error(
        `fields[${i}].type must be "string" | "i32" | "i64", got: ${type}`,
      );
    }

    const optional = field["optional"];
    if (optional !== undefined && typeof optional !== "boolean") {
      throw new Error(`fields[${i}].optional must be boolean when present`);
    }

    return { name, type: type as FieldType, optional: optional === true };
  });

  return { fields };
}
