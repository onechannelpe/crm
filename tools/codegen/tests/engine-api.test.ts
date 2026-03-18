import { describe, expect, test } from "bun:test";

import { parseEngineApiSpec } from "../src/engine-api/parse.ts";
import { renderEngineApiContract } from "../src/engine-api/render.ts";

describe("parseEngineApiSpec", () => {
  const minimal = {
    version: "v1",
    endpoints: { search: "/search" },
  };

  test("accepts a valid spec", () => {
    const spec = parseEngineApiSpec(minimal);
    expect(spec.version).toBe("v1");
    expect(spec.endpoints.search).toBe("/search");
  });

  test("accepts multiple endpoints", () => {
    const spec = parseEngineApiSpec({
      version: "v2",
      endpoints: { search: "/search", health: "/health", leads: "/leads" },
    });
    expect(Object.keys(spec.endpoints)).toHaveLength(3);
  });

  test("rejects non-object input", () => {
    expect(() => parseEngineApiSpec(null)).toThrow();
    expect(() => parseEngineApiSpec(42)).toThrow();
    expect(() => parseEngineApiSpec([])).toThrow();
  });

  test("rejects missing version", () => {
    expect(() =>
      parseEngineApiSpec({ endpoints: { search: "/search" } }),
    ).toThrow("version");
  });

  test("rejects version not matching v{n}", () => {
    expect(() => parseEngineApiSpec({ ...minimal, version: "1" })).toThrow();
    expect(() =>
      parseEngineApiSpec({ ...minimal, version: "version1" }),
    ).toThrow();
  });

  test("rejects empty endpoints object", () => {
    expect(() => parseEngineApiSpec({ version: "v1", endpoints: {} })).toThrow(
      "at least one",
    );
  });

  test("rejects endpoint path not starting with /", () => {
    expect(() =>
      parseEngineApiSpec({ version: "v1", endpoints: { search: "search" } }),
    ).toThrow("start with /");
  });

  test("rejects invalid endpoint key", () => {
    expect(() =>
      parseEngineApiSpec({ version: "v1", endpoints: { "my-key": "/path" } }),
    ).toThrow("invalid endpoint key");
  });
});

describe("renderEngineApiContract", () => {
  test("output is marked as generated", () => {
    const spec = parseEngineApiSpec({
      version: "v1",
      endpoints: { search: "/search" },
    });
    const output = renderEngineApiContract(spec);
    expect(output).toContain("GENERATED FILE");
  });

  test("version constant is present", () => {
    const spec = parseEngineApiSpec({
      version: "v1",
      endpoints: { search: "/search" },
    });
    const output = renderEngineApiContract(spec);
    expect(output).toContain('ENGINE_API_VERSION = "v1"');
  });

  test("endpoint entries appear in output", () => {
    const spec = parseEngineApiSpec({
      version: "v1",
      endpoints: { search: "/search", health: "/health" },
    });
    const output = renderEngineApiContract(spec);
    expect(output).toContain('search: "/search"');
    expect(output).toContain('health: "/health"');
  });

  test("engineApiPath helper function is present", () => {
    const spec = parseEngineApiSpec({
      version: "v1",
      endpoints: { search: "/search" },
    });
    const output = renderEngineApiContract(spec);
    expect(output).toContain("function engineApiPath");
  });

  test("output ends with a newline", () => {
    const spec = parseEngineApiSpec({
      version: "v1",
      endpoints: { search: "/search" },
    });
    const output = renderEngineApiContract(spec);
    expect(output.endsWith("\n")).toBe(true);
  });
});
