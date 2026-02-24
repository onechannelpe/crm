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
    expect(getRoutePermission("/sales/records/new")).toBe("sales:create");
    expect(getRoutePermission("/sales/records/123/edit")).toBe("sales:submit");
    expect(getRoutePermission("/sales/reports/exports")).toBe("sales:review");
    expect(getRoutePermission("/sales/reports/exports/123")).toBe(
      "sales:review",
    );
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

describe("nav policy", () => {
  it("filters sidebar route sections by role", () => {
    const executivePrimary = getSidebarRoutes("executive", "primary").map(
      (route) => route.href,
    );
    expect(executivePrimary).toContain("/sales/records/new");
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
    expect(salesChildren).toEqual([
      "/sales/leads",
      "/sales/review/confirmed",
      "/sales/review/queue",
      "/sales/reports/exports",
    ]);
  });

  it("filters sales children for executive (no sales:review)", () => {
    // executive has leads:read but NOT sales:review, so
    // confirmed, queue and exports routes are excluded
    const salesChildren = getSidebarChildren("executive", "sales").map(
      (child) => child.href,
    );
    expect(salesChildren).toEqual(["/sales/leads"]);
  });

  it("resolves header metadata for static routes", () => {
    expect(getHeaderRoute("/contacts/people").label).toBe("People");
    expect(getHeaderRoute("/contacts/companies").label).toBe("Companies");
    expect(getHeaderRoute("/profile").label).toBe("Profile");
    expect(getHeaderRoute("/unknown").label).toBe("Workspace");
  });

  it("resolves header metadata for dynamic routes", () => {
    expect(getHeaderRoute("/sales/records/42/edit").label).toBe("Edit sale");
    expect(getHeaderRoute("/sales/records/42/edit").icon).toBe("new-sale");
  });

  it("resolves header via active-prefix for sub-paths", () => {
    // /sales/leads has its own nav entry with a header, so it returns "Leads"
    expect(getHeaderRoute("/sales/leads").label).toBe("Leads");
    // /dashboard sub-path resolution
    expect(getHeaderRoute("/dashboard").label).toBe("Home");
  });
});
