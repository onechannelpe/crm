import { describe, expect, it } from "vitest";

import { getWorkspaceScopeForRole } from "../../src/lib/auth/access/workspace-scope";

describe("workspace scope policy", () => {
  it("maps team-scoped roles", () => {
    expect(getWorkspaceScopeForRole("executive")).toBe("team");
    expect(getWorkspaceScopeForRole("supervisor")).toBe("team");
  });

  it("maps branch-scoped roles", () => {
    expect(getWorkspaceScopeForRole("admin")).toBe("branch");
    expect(getWorkspaceScopeForRole("hr")).toBe("branch");
    expect(getWorkspaceScopeForRole("logistics")).toBe("branch");
  });

  it("maps superuser to global scope", () => {
    expect(getWorkspaceScopeForRole("superuser")).toBe("global");
  });
});
