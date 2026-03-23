import { describe, expect, it } from "vitest";

import { ROUTE_MANIFEST } from "../../src/lib/auth/access/route-manifest";
import {
  canAccessPath,
  getDefaultAppPath,
  getRoutePermission,
} from "../../src/lib/auth/access/route-policy";
import { SIDEBAR_ENTRIES } from "../../src/lib/nav/nav-config";
import { getHeaderRoute } from "../../src/lib/nav/nav-policy";

describe("route permissions", () => {
  it("resolves static and dynamic route permissions", () => {
    expect(getRoutePermission("/team")).toBe("team:read");
    expect(getRoutePermission("/sales/records/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/records/123/edit")).toBe("sales:create");
    expect(getRoutePermission("/sales/reports/exports")).toBe("sales:review");
    expect(getRoutePermission("/sales/reports/exports/123")).toBe(
      "sales:review",
    );
    expect(getRoutePermission("/dashboard")).toBe("sales:review");
    expect(getRoutePermission("/settings/profile")).toBeNull();
  });

  it("enforces role access checks for restricted paths", () => {
    expect(canAccessPath("executive", "/audit")).toBe(false);
    expect(canAccessPath("supervisor", "/audit")).toBe(true);
    expect(canAccessPath("executive", "/settings/capacity-policies")).toBe(
      false,
    );
    expect(canAccessPath("executive", "/team")).toBe(false);
    expect(canAccessPath("hr", "/team")).toBe(true);
    expect(canAccessPath("admin", "/settings/catalog")).toBe(true);
    expect(canAccessPath("sales_manager", "/sales/records/42/edit")).toBe(
      false,
    );
    expect(canAccessPath("executive", "/sales/records/42/edit")).toBe(true);
  });

  it("returns a role-safe default path", () => {
    expect(getDefaultAppPath("executive")).toBe("/sales/leads");
    expect(getDefaultAppPath("logistics")).toBe("/inventory");
    expect(getDefaultAppPath("hr")).toBe("/team");
    expect(getDefaultAppPath("admin")).toBe("/dashboard");
  });
});

describe("nav config structural invariants", () => {
  it("resolves header metadata for dynamic routes", () => {
    expect(getHeaderRoute("/sales/records/42/edit").label).toBe("Editar venta");
    expect(getHeaderRoute("/sales/records/42/edit").icon).toBe("new-sale");
  });

  it("resolves header via active-prefix for sub-paths", () => {
    expect(getHeaderRoute("/sales/leads").label).toBe("Prospectos");
    expect(getHeaderRoute("/dashboard").label).toBe("Inicio");
  });

  it("every sidebar route href is registered in the route manifest", () => {
    const unregistered = SIDEBAR_ENTRIES.filter(
      (r) => !(r.href in ROUTE_MANIFEST),
    ).map((r) => r.href);

    expect(unregistered).toEqual([]);
  });
});
