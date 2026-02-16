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
    expect(getRoutePermission("/sales/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/123/fix")).toBe("sales:submit");
    expect(getRoutePermission("/dashboard")).toBeNull();
  });

  it("enforces role access checks for restricted paths", () => {
    expect(canAccessPath("executive", "/settings")).toBe(false);
    expect(canAccessPath("admin", "/settings")).toBe(true);
    expect(canAccessPath("sales_manager", "/sales/42/fix")).toBe(false);
    expect(canAccessPath("executive", "/sales/42/fix")).toBe(true);
  });

  it("filters search and sidebar routes by role", () => {
    const executiveSearch = getSearchRoutes("executive").map((it) => it.href);
    expect(executiveSearch).toContain("/leads");
    expect(executiveSearch).not.toContain("/settings");

    const inventorySidebar = getSidebarRoutes("logistics", "inventory").map(
      (it) => it.href,
    );
    expect(inventorySidebar).toEqual(["/inventory"]);

    const salesSidebar = getSidebarRoutes("logistics", "sales").map(
      (it) => it.href,
    );
    expect(salesSidebar).toEqual([]);
  });
});
