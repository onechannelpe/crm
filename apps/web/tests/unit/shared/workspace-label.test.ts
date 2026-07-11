import { describe, expect, it } from "vitest";

import { getWorkspaceLabel } from "~/lib/auth/access/workspace-label";
import { BranchId, TeamId, UserId } from "~/server/shared/ids";

describe("workspace label policy", () => {
  it("renders executive label with supervisor first name", () => {
    const label = getWorkspaceLabel({
      role: "executive",
      names: "Ana",
      scopeType: "team",
      team: { id: TeamId.trust("1"), name: "Alpha" },
      supervisor: { id: UserId.trust("2"), names: "Diego" },
      branch: { id: BranchId.trust("1"), name: "Lima" },
    });

    expect(label).toBe("Equipo de Diego");
  });

  it("renders supervisor label from team name", () => {
    const label = getWorkspaceLabel({
      role: "supervisor",
      names: "Diego",
      scopeType: "team",
      team: { id: TeamId.trust("1"), name: "Alpha" },
      supervisor: null,
      branch: { id: BranchId.trust("1"), name: "Lima" },
    });

    expect(label).toBe("Equipo Alpha");
  });

  it("renders branch label for branch-scoped roles", () => {
    const label = getWorkspaceLabel({
      role: "admin",
      names: "Maria",
      scopeType: "branch",
      team: null,
      supervisor: null,
      branch: { id: BranchId.trust("1"), name: "Lima" },
    });

    expect(label).toBe("Sucursal Lima");
  });

  it("renders global label for superuser", () => {
    const label = getWorkspaceLabel({
      role: "superuser",
      names: "Root",
      scopeType: "global",
      team: null,
      supervisor: null,
      branch: null,
    });

    expect(label).toBe("Plataforma global");
  });
});
