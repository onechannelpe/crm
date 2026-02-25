import { describe, expect, it } from "vitest";

import {
  collectParams,
  parseHtmlChunks,
  parseTextChunks,
} from "../src/build/parse-chunks";

describe("parseHtmlChunks", () => {
  it("extracts params from {{name}} syntax", () => {
    const chunks = parseHtmlChunks("<p>{{greeting}}, {{name}}</p>");
    expect(chunks).toEqual([
      { type: "literal", value: "<p>" },
      { type: "param", name: "greeting" },
      { type: "literal", value: ", " },
      { type: "param", name: "name" },
      { type: "literal", value: "</p>" },
    ]);
  });

  it("parses if/endif blocks into ifblock nodes", () => {
    const html =
      "before<!-- __CRM_IF_title__ --><h1>{{title}}</h1><!-- __CRM_ENDIF__ -->after";
    const chunks = parseHtmlChunks(html);
    expect(chunks).toEqual([
      { type: "literal", value: "before" },
      {
        type: "ifblock",
        param: "title",
        inner: [
          { type: "literal", value: "<h1>" },
          { type: "param", name: "title" },
          { type: "literal", value: "</h1>" },
        ],
      },
      { type: "literal", value: "after" },
    ]);
  });

  it("throws on unmatched crm:if (no endif)", () => {
    const html = "<!-- __CRM_IF_title__ --><h1>{{title}}</h1>";
    expect(() => parseHtmlChunks(html)).toThrow("Unmatched crm:if:title");
  });
});

describe("parseTextChunks", () => {
  it("parses {{#if param}}...{{/if}} blocks", () => {
    const text = "{{#if title}}{{title}}\n\n{{/if}}{{body}}";
    const chunks = parseTextChunks(text);
    expect(chunks).toEqual([
      {
        type: "ifblock",
        param: "title",
        inner: [
          { type: "param", name: "title" },
          { type: "literal", value: "\n\n" },
        ],
      },
      { type: "param", name: "body" },
    ]);
  });

  it("throws on unmatched {{#if}}", () => {
    expect(() => parseTextChunks("{{#if title}}hello")).toThrow(
      "Unmatched {{#if title}}",
    );
  });
});

describe("collectParams", () => {
  it("collects required and optional params", () => {
    const chunks = parseHtmlChunks(
      "{{name}}<!-- __CRM_IF_title__ -->{{title}}<!-- __CRM_ENDIF__ -->",
    );
    const { all, optional } = collectParams(chunks);
    expect(all).toEqual(["name", "title"]);
    expect(optional.has("title")).toBe(true);
    expect(optional.has("name")).toBe(false);
  });

  it("deduplicates params used multiple times", () => {
    const chunks = parseHtmlChunks("{{name}} and {{name}} again");
    const { all } = collectParams(chunks);
    expect(all).toEqual(["name"]);
  });
});
