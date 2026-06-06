import { describe, expect, test } from "bun:test";

import {
  parseRecordApiSpec,
  renderRecordContractRust,
  renderRecordContractTs,
} from "../src/record-api.ts";

// fixture

const VALID_SPEC = {
  response: {
    candidate: {
      fields: [
        { name: "ruc", type: "string" },
        { name: "person_name", type: "string" },
        { name: "phone_primary", type: "string" },
      ],
    },
  },
  request: {
    import_row: {
      fields: [
        { name: "ruc", type: "string" },
        { name: "dni", type: "string" },
        { name: "quality_tier", type: "i32", optional: true },
        { name: "branch_tag", type: "i64", optional: true },
      ],
    },
  },
};

describe("parseRecordApiSpec", () => {
  test("accepts a valid spec", () => {
    const spec = parseRecordApiSpec(VALID_SPEC);
    expect(spec.response.candidate.fields).toHaveLength(3);
    expect(spec.request.import_row.fields).toHaveLength(4);
  });

  test("optional flag defaults to false when absent", () => {
    const spec = parseRecordApiSpec(VALID_SPEC);
    const field = spec.response.candidate.fields[0]!;
    expect(field.optional).toBe(false);
  });

  test("optional flag is preserved when true", () => {
    const spec = parseRecordApiSpec(VALID_SPEC);
    const fields = spec.request.import_row.fields;
    expect(fields.find((f) => f.name === "quality_tier")!.optional).toBe(true);
  });

  test("rejects non-object input", () => {
    expect(() => parseRecordApiSpec(null)).toThrow();
    expect(() => parseRecordApiSpec("string")).toThrow();
  });

  test("rejects missing response", () => {
    expect(() => parseRecordApiSpec({ request: VALID_SPEC.request })).toThrow(
      "response",
    );
  });

  test("rejects missing request", () => {
    expect(() => parseRecordApiSpec({ response: VALID_SPEC.response })).toThrow(
      "request",
    );
  });

  test("rejects invalid field type", () => {
    expect(() =>
      parseRecordApiSpec({
        ...VALID_SPEC,
        response: {
          candidate: { fields: [{ name: "x", type: "float" }] },
        },
      }),
    ).toThrow('"string" | "i32" | "i64"');
  });

  test("rejects non-boolean optional", () => {
    expect(() =>
      parseRecordApiSpec({
        ...VALID_SPEC,
        request: {
          import_row: {
            fields: [{ name: "x", type: "string", optional: "yes" }],
          },
        },
      }),
    ).toThrow("boolean");
  });
});

describe("renderRecordContractRust", () => {
  test("output is marked as generated", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("GENERATED FILE");
  });

  test("RecordCandidate struct is present", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("pub struct RecordCandidate");
  });

  test("optional i32 field renders as Option<i32>", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("pub quality_tier: Option<i32>");
  });

  test("optional i64 field renders as Option<i64>", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("pub branch_tag: Option<i64>");
  });

  test("required string field renders without Option", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("pub ruc: String");
    expect(output).not.toContain("pub ruc: Option<String>");
  });

  test("output ends with newline", () => {
    const output = renderRecordContractRust(parseRecordApiSpec(VALID_SPEC));
    expect(output.endsWith("\n")).toBe(true);
  });
});

describe("renderRecordContractTs", () => {
  test("output is marked as generated", () => {
    const output = renderRecordContractTs(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("GENERATED FILE");
  });

  test("RecordCandidate interface is present", () => {
    const output = renderRecordContractTs(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("export interface RecordCandidate");
  });

  test("optional field uses ? notation", () => {
    const output = renderRecordContractTs(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("quality_tier?:");
  });

  test("required field has no ?", () => {
    const output = renderRecordContractTs(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("ruc: string;");
    expect(output).not.toContain("ruc?:");
  });

  test("numeric types render as number", () => {
    const output = renderRecordContractTs(parseRecordApiSpec(VALID_SPEC));
    expect(output).toContain("quality_tier?: number");
    expect(output).toContain("branch_tag?: number");
  });
});
