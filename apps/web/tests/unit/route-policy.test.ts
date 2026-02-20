import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  getRoutePermission,
  getSearchRoutes,
  getSidebarRoutes,
} from "../../src/lib/auth/access/route-policy";

describe("route policy", () => {
  it("resolves static and dynamic route permissions", () => {
    expect(getRoutePermission("/settings")).toBe("admin:manage");
    expect(getRoutePermission("/team/new")).toBe("hr:manage");
    expect(getRoutePermission("/sales/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/123/fix")).toBe("sales:submit");
    expect(getRoutePermission("/dashboard")).toBeNull();
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

  it("filters search and sidebar routes by role", () => {
    const executiveSearch = getSearchRoutes("executive").map(
      (route) => route.href,
    );
    expect(executiveSearch).toContain("/leads");
    expect(executiveSearch).toContain("/client-search/people");
    expect(executiveSearch).not.toContain("/audit");
    expect(executiveSearch).not.toContain("/quota");
    expect(executiveSearch).not.toContain("/settings");

    const supervisorSearch = getSearchRoutes("supervisor").map(
      (route) => route.href,
    );
    expect(supervisorSearch).toContain("/audit");

    const inventorySidebar = getSidebarRoutes("logistics", "inventory").map(
      (route) => route.href,
    );
    expect(inventorySidebar).toEqual(["/inventory"]);

    const salesSidebar = getSidebarRoutes("logistics", "sales").map(
      (route) => route.href,
    );
    expect(salesSidebar).toEqual([]);
  });
});
