import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  getDefaultAppPath,
  getHeaderRoute,
  getRoutePermission,
  getSidebarChildren,
  getSidebarRoutes,
  isKnownProtectedRoute,
} from "../../src/lib/auth/access/route-policy";

describe("route policy", () => {
  it("resolves static and dynamic route permissions", () => {
    expect(getRoutePermission("/settings")).toBe("admin:manage");
    expect(getRoutePermission("/team/new")).toBe("hr:manage");
    expect(getRoutePermission("/sales/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/123/fix")).toBe("sales:submit");
    expect(getRoutePermission("/dashboard")).toBe("sales:review");
  });

  it("enforces role access checks for restricted paths", () => {
    expect(canAccessPath("executive", "/settings")).toBe(false);
    expect(canAccessPath("executive", "/audit")).toBe(false);
    expect(canAccessPath("supervisor", "/audit")).toBe(true);
    expect(canAccessPath("executive", "/quota")).toBe(false);
    expect(canAccessPath("executive", "/team/new")).toBe(false);
    expect(canAccessPath("hr", "/team/new")).toBe(true);
    expect(canAccessPath("admin", "/settings")).toBe(true);
    expect(canAccessPath("sales_manager", "/sales/42/fix")).toBe(false);
    expect(canAccessPath("executive", "/sales/42/fix")).toBe(true);
  });

  it("filters sidebar route sections by role", () => {
    const executiveQuick = getSidebarRoutes("executive", "quick").map(
      (route) => route.href,
    );
    expect(executiveQuick).toContain("/client-search/people");
    expect(executiveQuick).not.toContain("/settings");

    const supervisorWorkspace = getSidebarRoutes("supervisor", "workspace").map(
      (route) => route.href,
    );
    expect(supervisorWorkspace).toContain("/audit");

    const inventorySidebar = getSidebarRoutes("logistics", "workspace").map(
      (route) => route.href,
    );
    expect(inventorySidebar).toEqual(["/inventory"]);

    const salesSidebar = getSidebarChildren("logistics", "leads").map(
      (child) => child.route.href,
    );
    expect(salesSidebar).toEqual([]);
  });

  it("returns a role-safe default path", () => {
    expect(getDefaultAppPath("executive")).toBe("/leads");
    expect(getDefaultAppPath("logistics")).toBe("/inventory");
    expect(getDefaultAppPath("hr")).toBe("/team");
    expect(getDefaultAppPath("admin")).toBe("/dashboard");
  });

  it("covers all protected app routes in the route catalog", () => {
    const protectedPaths = [
      "/dashboard",
      "/leads",
      "/client-search/people",
      "/client-search/companies",
      "/team",
      "/team/new",
      "/inventory",
      "/validation",
      "/audit",
      "/quota",
      "/sales/new",
      "/sales/42/fix",
      "/settings",
      "/profile",
    ];

    for (const pathname of protectedPaths) {
      expect(isKnownProtectedRoute(pathname)).toBe(true);
    }
  });

  it("resolves header metadata from the same catalog", () => {
    expect(getHeaderRoute("/sales/new").label).toBe("Workflows");
    expect(getHeaderRoute("/sales/42/fix").label).toBe("Workflows");
    expect(getHeaderRoute("/profile").label).toBe("Profile");
    expect(getHeaderRoute("/unknown").label).toBe("Workspace");
  });
});
