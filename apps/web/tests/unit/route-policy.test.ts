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
    expect(getRoutePermission("/review")).toBe("lead:review");
    expect(getRoutePermission("/review/123")).toBe("lead:review");
    expect(getRoutePermission("/quotations")).toBe("quotation:manage");
    expect(getRoutePermission("/quotations/123")).toBe("quotation:manage");
    expect(getRoutePermission("/leads")).toBe("lead:pipeline");
    expect(getRoutePermission("/leads/new")).toBe("lead:pipeline");
    expect(getRoutePermission("/leads/123")).toBe("lead:pipeline");
    expect(getRoutePermission("/sales/crm")).toBe("lead:register");
    expect(getRoutePermission("/sales/new/123")).toBe("lead:register");
    expect(getRoutePermission("/sales/123")).toBe("lead:register");
    expect(getRoutePermission("/integrations/imports/123")).toBe(
      "integration:manage",
    );
    expect(getRoutePermission("/sales/reports/exports")).toBeNull();
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
    expect(canAccessPath("executive", "/leads")).toBe(true);
    expect(canAccessPath("admin", "/leads")).toBe(false);
    expect(canAccessPath("executive", "/team")).toBe(false);
    expect(canAccessPath("hr", "/team")).toBe(true);
    expect(canAccessPath("admin", "/settings/catalog")).toBe(true);
    expect(canAccessPath("sales_manager", "/sales/new/42")).toBe(false);
    expect(canAccessPath("executive", "/sales/new/42")).toBe(true);
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
    expect(getHeaderRoute("/sales/new/42").label).toBe("Registrar venta");
    expect(getHeaderRoute("/sales/new/42").icon).toBe("new-sale");
    expect(getHeaderRoute("/sales/42").label).toBe("Detalle de venta");
    expect(getHeaderRoute("/review/42").label).toBe("Revisar prospecto");
  });

  it("uses fallback when no header rule exists", () => {
    expect(getHeaderRoute("/unknown-route").label).toBe("Espacio de trabajo");
    expect(getHeaderRoute("/sales/new/42").label).toBe("Registrar venta");
    expect(getHeaderRoute("/dashboard").label).toBe("Inicio");
  });

  it("every sidebar route href is registered in the route manifest", () => {
    const unregistered = SIDEBAR_ENTRIES.filter(
      (r) => !(r.href in ROUTE_MANIFEST),
    ).map((r) => r.href);

    expect(unregistered).toEqual([]);
  });
});
