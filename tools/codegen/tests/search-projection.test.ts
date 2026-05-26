import { describe, expect, test } from "bun:test";

import {
  groupByObject,
  fieldProp,
  infoTypeName,
  NULLABLE_OBJECTS,
} from "../src/search-projection/group.ts";
import { parseProjectionSpec } from "../src/search-projection/parse.ts";
import {
  renderProjectionContractRust,
  renderResultContractRust,
} from "../src/search-projection/render-rust.ts";
import {
  renderProjectionContractTs,
  renderResultContractTs,
} from "../src/search-projection/render-ts.ts";

// fixture

const MINIMAL_SPEC = {
  projection: "search_projection",
  fields: [
    {
      path: "person.dni",
      canonical_fields: ["person_dni"],
      nullable: false,
      storage: [{ table: "search_projection", column: "dni" }],
    },
    {
      path: "person.name",
      canonical_fields: ["person_full_name"],
      nullable: true,
      storage: [{ table: "search_projection", column: "name" }],
    },
    {
      path: "org.ruc",
      canonical_fields: ["company_ruc"],
      nullable: true,
      storage: [{ table: "search_projection", column: "org_ruc" }],
    },
    {
      path: "phones.siblings",
      canonical_fields: ["phone"],
      nullable: true,
      value_type: "string_array",
      derivation: "grouped_phone_aggregate",
      storage: [
        { table: "ruc_phone_agg", column: "phones" },
        { table: "dni_phone_agg", column: "phones" },
      ],
    },
  ],
};

describe("parseProjectionSpec", () => {
  test("accepts a valid spec", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.projection).toBe("search_projection");
    expect(spec.fields).toHaveLength(4);
  });

  test("nullable defaults to false when absent", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[0]!.nullable).toBe(false);
  });

  test("nullable:true is preserved", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[1]!.nullable).toBe(true);
  });

  test("value_type defaults to string when absent", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[0]!.value_type).toBe("string");
  });

  test("value_type string_array is preserved", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[3]!.value_type).toBe("string_array");
  });

  test("derivation is preserved when present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[3]!.derivation).toBe("grouped_phone_aggregate");
  });

  test("derivation is undefined when absent", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[0]!.derivation).toBeUndefined();
  });

  test("multiple storage entries are supported", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(spec.fields[3]!.storage).toHaveLength(2);
  });

  test("rejects non-object input", () => {
    expect(() => parseProjectionSpec(null)).toThrow();
    expect(() => parseProjectionSpec(42)).toThrow();
  });

  test("rejects empty storage array", () => {
    expect(() =>
      parseProjectionSpec({
        ...MINIMAL_SPEC,
        fields: [{ ...MINIMAL_SPEC.fields[0], storage: [] }],
      }),
    ).toThrow("non-empty");
  });

  test("rejects storage entry with empty table", () => {
    expect(() =>
      parseProjectionSpec({
        ...MINIMAL_SPEC,
        fields: [
          {
            ...MINIMAL_SPEC.fields[0],
            storage: [{ table: "", column: "col" }],
          },
        ],
      }),
    ).toThrow("non-empty");
  });
});

describe("groupByObject", () => {
  test("groups fields by object prefix", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const groups = groupByObject(spec.fields);
    const names = groups.map((g) => g.objectName);
    expect(names).toContain("person");
    expect(names).toContain("org");
    expect(names).toContain("phones");
  });

  test("org comes before person because org is in preferred order and person is not", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const groups = groupByObject(spec.fields);
    const names = groups.map((g) => g.objectName);
    expect(names.indexOf("org")).toBeLessThan(names.indexOf("person"));
  });

  test("throws on malformed path", () => {
    expect(() =>
      groupByObject([
        {
          path: "nodot",
          canonical_fields: ["x"],
          nullable: false,
          value_type: "string",
          derivation: undefined,
          storage: [{ table: "t", column: "c" }],
        },
      ]),
    ).toThrow("object.property");
  });
});

describe("fieldProp", () => {
  test("returns the property portion of a path", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    expect(fieldProp(spec.fields[0]!)).toBe("dni");
    expect(fieldProp(spec.fields[2]!)).toBe("ruc");
  });
});

describe("infoTypeName", () => {
  test("org maps to OrgInfo", () =>
    expect(infoTypeName("org")).toBe("OrgInfo"));
  test("phones maps to PhoneInfo", () =>
    expect(infoTypeName("phones")).toBe("PhoneInfo"));
  test("person maps to PersonInfo", () =>
    expect(infoTypeName("person")).toBe("PersonInfo"));
  test("role maps to RoleInfo", () =>
    expect(infoTypeName("role")).toBe("RoleInfo"));
});

describe("NULLABLE_OBJECTS", () => {
  test("org is nullable", () => expect(NULLABLE_OBJECTS.has("org")).toBe(true));
  test("role is nullable", () =>
    expect(NULLABLE_OBJECTS.has("role")).toBe(true));
  test("person is not nullable", () =>
    expect(NULLABLE_OBJECTS.has("person")).toBe(false));
});

describe("renderProjectionContractRust", () => {
  test("output is marked as generated", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractRust(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain("GENERATED FILE");
  });

  test("projection name constant is present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractRust(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain(
      'SEARCH_PROJECTION_NAME: &str = "search_projection"',
    );
  });

  test("all paths appear in PATHS constant", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractRust(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain('"person.dni"');
    expect(output).toContain('"phones.siblings"');
  });

  test("multi-storage field produces two mapping entries", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractRust(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain('"ruc_phone_agg"');
    expect(output).toContain('"dni_phone_agg"');
  });
});

describe("renderResultContractRust", () => {
  test("PersonInfo struct is present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractRust(spec, spec);
    expect(output).toContain("pub struct PersonInfo");
  });

  test("nullable string field renders as Option<String>", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractRust(spec, spec);
    expect(output).toContain("pub name: Option<String>");
  });

  test("non-nullable string field renders as String", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractRust(spec, spec);
    expect(output).toContain("pub dni: String");
  });

  test("nullable string_array field renders as Option<Vec<String>>", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractRust(spec, spec);
    expect(output).toContain("pub siblings: Option<Vec<String>>");
  });

  test("org field in DocumentRow is Option<OrgInfo>", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractRust(spec, spec);
    expect(output).toContain("pub org: Option<OrgInfo>");
  });
});

describe("renderProjectionContractTs", () => {
  test("SEARCH_PROJECTION_NAME constant is present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractTs(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain("SEARCH_PROJECTION_NAME");
    expect(output).toContain('"search_projection"');
  });

  test("nullable path appears in NULLABLE_PATHS", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractTs(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    expect(output).toContain("SEARCH_PROJECTION_NULLABLE_PATHS");
    expect(output).toContain('"person.name"');
  });

  test("non-nullable path does not appear in NULLABLE_PATHS", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderProjectionContractTs(
      spec,
      "SEARCH_PROJECTION",
      "contracts/engine/search-projection.json",
    );
    // person.dni is not nullable
    const nullableSection = output.slice(output.indexOf("NULLABLE_PATHS"));
    expect(nullableSection).not.toContain('"person.dni"');
  });
});

describe("renderResultContractTs", () => {
  test("PersonInfo interface is present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("export interface PersonInfo");
  });

  test("nullable string field renders as string | null", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("name: string | null;");
  });

  test("non-nullable string field renders as string", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("dni: string;");
  });

  test("nullable string_array field renders as string[] | null", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("siblings: string[] | null;");
  });

  test("DocumentRow has org as OrgInfo | null", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("org: OrgInfo | null;");
  });

  test("SearchResponse interface is present", () => {
    const spec = parseProjectionSpec(MINIMAL_SPEC);
    const output = renderResultContractTs(spec, spec);
    expect(output).toContain("export interface SearchResponse");
  });
});
