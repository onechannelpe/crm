import { describe, expect, it } from "vitest";

import { getWorkspaceLabel } from "../../src/lib/auth/access/workspace-label";

describe("workspace label policy", () => {
  it("renders executive label with supervisor first name", () => {
    const label = getWorkspaceLabel({
      role: "executive",
      fullName: "Ana Perez",
      scopeType: "team",
      team: { id: 1, name: "Alpha" },
      supervisor: { id: 2, fullName: "Diego Ramirez" },
      branch: { id: 1, name: "Lima" },
    });

    expect(label).toBe("equipo de Diego");
  });

  it("renders supervisor label from team name", () => {
    const label = getWorkspaceLabel({
      role: "supervisor",
      fullName: "Diego Ramirez",
      scopeType: "team",
      team: { id: 1, name: "Alpha" },
      supervisor: null,
      branch: { id: 1, name: "Lima" },
    });

    expect(label).toBe("equipo Alpha");
  });

  it("renders branch label for branch-scoped roles", () => {
    const label = getWorkspaceLabel({
      role: "admin",
      fullName: "Maria Lopez",
      scopeType: "branch",
      team: null,
      supervisor: null,
      branch: { id: 1, name: "Lima" },
    });

    expect(label).toBe("sucursal Lima");
  });

  it("renders global label for superuser", () => {
    const label = getWorkspaceLabel({
      role: "superuser",
      fullName: "Root User",
      scopeType: "global",
      team: null,
      supervisor: null,
      branch: null,
    });

    expect(label).toBe("plataforma global");
  });
});
