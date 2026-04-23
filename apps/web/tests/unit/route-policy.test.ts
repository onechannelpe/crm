import { describe, expect, it } from "vitest";

import { ROUTE_MANIFEST } from "../../src/lib/auth/access/route-manifest";
import {
  canAccessPath,
  getDefaultAppPath,
  getRoutePermission,
} from "../../src/lib/auth/access/route-policy";
import { SIDEBAR_ENTRIES } from "../../src/lib/nav/config";
import { getHeaderRoute } from "../../src/lib/nav/policy";

describe("route permissions", () => {
  it("resolves static and dynamic route permissions", () => {
    expect(getRoutePermission("/team")).toBe("team:read");
    expect(getRoutePermission("/leads")).toBeNull();
    expect(getRoutePermission("/rate-simulator")).toBe("lead:rate:simulate");
    expect(getRoutePermission("/leads/new")).toBeNull();
    expect(getRoutePermission("/leads/123")).toBeNull();
    expect(getRoutePermission("/dashboard")).toBe("lead:work");
    expect(getRoutePermission("/settings/profile")).toBeNull();
  });

  it("enforces role access checks for restricted paths", () => {
    expect(canAccessPath("executive", "/audit")).toBe(false);
    expect(canAccessPath("supervisor", "/audit")).toBe(true);
    expect(canAccessPath("executive", "/settings/capacity-policies")).toBe(
      false,
    );
    expect(canAccessPath("executive", "/leads")).toBe(true);
    expect(canAccessPath("executive", "/rate-simulator")).toBe(true);
    expect(canAccessPath("admin", "/leads")).toBe(true);
    expect(canAccessPath("admin", "/rate-simulator")).toBe(true);
    expect(canAccessPath("logistics", "/leads")).toBe(true);
    expect(canAccessPath("logistics", "/rate-simulator")).toBe(false);
    expect(canAccessPath("executive", "/team")).toBe(false);
    expect(canAccessPath("hr", "/team")).toBe(true);
    expect(canAccessPath("admin", "/settings/catalog")).toBe(true);
  });

  it("returns a role-safe default path", () => {
    expect(getDefaultAppPath("executive")).toBe("/leads");
    expect(getDefaultAppPath("logistics")).toBe("/inventory");
    expect(getDefaultAppPath("hr")).toBe("/team");
    expect(getDefaultAppPath("admin")).toBe("/dashboard");
  });
});

describe("nav config structural invariants", () => {
  it("resolves header metadata for current dynamic routes", () => {
    expect(getHeaderRoute("/rate-simulator").label).toBe("Simulador de tasas");
  });

  it("uses fallback when no header rule exists", () => {
    expect(getHeaderRoute("/unknown-route").label).toBe("Espacio de trabajo");
    expect(getHeaderRoute("/dashboard").label).toBe("Inicio");
  });

  it("every sidebar route href is registered in the route manifest", () => {
    const unregistered = SIDEBAR_ENTRIES.filter(
      (r) => !(r.href in ROUTE_MANIFEST),
    ).map((r) => r.href);

    expect(unregistered).toEqual([]);
  });
});
