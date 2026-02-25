import { describe, expect, it } from "vitest";

import { genHtmlExpr, genInterface, genTextExpr } from "../src/build/codegen";
import type { HtmlChunk, TextChunk } from "../src/build/parse-chunks";

describe("genHtmlExpr", () => {
  it("generates escaped param references", () => {
    const chunks: HtmlChunk[] = [{ type: "param", name: "name" }];
    expect(genHtmlExpr(chunks, new Set())).toBe("esc(p.name)");
  });

  it("adds .replace for multiline params", () => {
    const chunks: HtmlChunk[] = [{ type: "param", name: "body" }];
    const result = genHtmlExpr(chunks, new Set(["body"]));
    expect(result).toContain('.replace(/\\n/g, "<br/>")');
  });

  it("uses non-null assertion inside guarded ifblocks", () => {
    const chunks: HtmlChunk[] = [
      {
        type: "ifblock",
        param: "title",
        inner: [{ type: "param", name: "title" }],
      },
    ];
    const result = genHtmlExpr(chunks, new Set());
    expect(result).toContain("p.title?.trim()");
    expect(result).toContain("esc(p.title!)");
  });

  it("returns empty string expression for empty chunks", () => {
    expect(genHtmlExpr([], new Set())).toBe('""');
  });
});

describe("genTextExpr", () => {
  it("generates raw param references (no escaping)", () => {
    const chunks: TextChunk[] = [{ type: "param", name: "name" }];
    expect(genTextExpr(chunks)).toBe("p.name");
  });

  it("uses non-null assertion inside guarded ifblocks", () => {
    const chunks: TextChunk[] = [
      {
        type: "ifblock",
        param: "title",
        inner: [{ type: "param", name: "title" }],
      },
    ];
    const result = genTextExpr(chunks);
    expect(result).toContain("p.title!");
  });
});

describe("genInterface", () => {
  it("generates required fields", () => {
    const result = genInterface("TestParams", ["name", "email"], new Set());
    expect(result).toBe(
      `export interface TestParams {\n  name: string;\n  email: string;\n}`,
    );
  });

  it("marks optional fields with ?", () => {
    const result = genInterface(
      "TestParams",
      ["name", "title"],
      new Set(["title"]),
    );
    expect(result).toContain("name: string;");
    expect(result).toContain("title?: string;");
  });
});
