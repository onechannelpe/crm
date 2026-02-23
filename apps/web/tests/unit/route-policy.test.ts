import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  getDefaultAppPath,
  getRoutePermission,
} from "../../src/lib/auth/access/route-policy";
import {
  getHeaderRoute,
  getSidebarChildren,
  getSidebarRoutes,
} from "../../src/lib/nav/nav-policy";

describe("route permissions", () => {
  it("resolves static and dynamic route permissions", () => {
    expect(getRoutePermission("/settings")).toBe("admin:manage");
    expect(getRoutePermission("/team/new")).toBe("hr:manage");
    expect(getRoutePermission("/sales/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/123/fix")).toBe("sales:submit");
    expect(getRoutePermission("/dashboard")).toBe("sales:review");
    expect(getRoutePermission("/profile")).toBeNull();
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

  it("returns a role-safe default path", () => {
    expect(getDefaultAppPath("executive")).toBe("/leads");
    expect(getDefaultAppPath("logistics")).toBe("/inventory");
    expect(getDefaultAppPath("hr")).toBe("/team");
    expect(getDefaultAppPath("admin")).toBe("/dashboard");
  });
});

describe("nav policy", () => {
  it("filters sidebar route sections by role", () => {
    const executivePrimary = getSidebarRoutes("executive", "primary").map(
      (route) => route.href,
    );
    expect(executivePrimary).toContain("/sales/new");
    expect(executivePrimary).not.toContain("/settings");

    const supervisorSecondary = getSidebarRoutes("supervisor", "secondary").map(
      (route) => route.href,
    );
    expect(supervisorSecondary).toContain("/audit");

    const inventorySidebar = getSidebarRoutes("logistics", "secondary").map(
      (route) => route.href,
    );
    expect(inventorySidebar).toEqual(["/inventory"]);
  });

  it("returns empty children when role lacks permission for all", () => {
    // logistics role has no leads:read permission, so the sales group's
    // children (leads, dashboard, review etc.) should all be filtered out
    const salesChildren = getSidebarChildren("logistics", "sales").map(
      (child) => child.href,
    );
    expect(salesChildren).toEqual([]);
  });

  it("returns accessible children ordered correctly", () => {
    // superuser has all permissions — all sales children are visible and ordered
    const salesChildren = getSidebarChildren("superuser", "sales").map(
      (child) => child.href,
    );
    expect(salesChildren).toEqual(["/leads", "/sales/approved", "/review"]);
  });

  it("filters sales children for executive (no sales:review)", () => {
    // executive has leads:read but NOT sales:review, so
    // /sales/approved and /review are excluded
    const salesChildren = getSidebarChildren("executive", "sales").map(
      (child) => child.href,
    );
    expect(salesChildren).toEqual(["/leads"]);
  });

  it("resolves header metadata for static routes", () => {
    expect(getHeaderRoute("/contacts/people").label).toBe("People");
    expect(getHeaderRoute("/contacts/companies").label).toBe("Companies");
    expect(getHeaderRoute("/profile").label).toBe("Profile");
    expect(getHeaderRoute("/unknown").label).toBe("Workspace");
  });

  it("resolves header metadata for dynamic routes", () => {
    expect(getHeaderRoute("/sales/42/fix").label).toBe("Fix sale");
    expect(getHeaderRoute("/sales/42/fix").icon).toBe("new-sale");
  });

  it("resolves header via active-prefix for sub-paths", () => {
    // /leads is an active prefix of the Sales group — but /leads itself has
    // its own nav entry with a header, so it should return "Leads"
    expect(getHeaderRoute("/leads").label).toBe("Leads");
    // /dashboard sub-path resolution
    expect(getHeaderRoute("/dashboard").label).toBe("Home");
  });
});
