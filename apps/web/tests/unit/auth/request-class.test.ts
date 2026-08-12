import { describe, expect, it } from "vitest";

import { classifyRequest } from "~/server/platform/http/request-class";

describe("classifyRequest", () => {
  it("classifies provider webhooks as machine", () => {
    expect(classifyRequest("/api/webhooks/whatsapp")).toBe("machine");
  });

  it("classifies explicit public routes and static assets", () => {
    expect(classifyRequest("/login")).toBe("public");
    expect(classifyRequest("/reset-password")).toBe("public");
    expect(classifyRequest("/auth/callback")).toBe("public");
    expect(classifyRequest("/api/auth/google")).toBe("public");
    expect(classifyRequest("/docs/api")).toBe("public");
    expect(classifyRequest("/privacy")).toBe("public");
    expect(classifyRequest("/terms")).toBe("public");
    expect(classifyRequest("/_build/assets.js")).toBe("public");
    expect(classifyRequest("/images/light-noise.png")).toBe("public");
    expect(classifyRequest("/favicon.ico")).toBe("public");
    expect(classifyRequest("/robots.txt")).toBe("public");
  });

  it("treats unknown app and api routes as browser, secure by default", () => {
    expect(classifyRequest("/home")).toBe("browser");
    expect(classifyRequest("/records")).toBe("browser");
    expect(classifyRequest("/releases/v1.0")).toBe("browser");
    expect(classifyRequest("/reports/export.csv")).toBe("browser");
    expect(classifyRequest("/api/me/avatar")).toBe("browser");
    expect(classifyRequest("/api/extension/handoff-token")).toBe("browser");
  });
});
