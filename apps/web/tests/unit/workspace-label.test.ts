import { describe, expect, it } from "vitest";

import { getWorkspaceLabel } from "../../src/lib/auth/access/workspace-label";
import { asBranchId, asTeamId, asUserId } from "../../src/server/shared/ids";

describe("workspace label policy", () => {
  it("renders executive label with supervisor first name", () => {
    const label = getWorkspaceLabel({
      role: "executive",
      names: "Ana",
      scopeType: "team",
      team: {
        id: asTeamId("00000000-0000-0000-0000-000000000001"),
        name: "Alpha",
      },
      supervisor: {
        id: asUserId("00000000-0000-0000-0000-000000000002"),
        names: "Diego",
      },
      branch: {
        id: asBranchId("00000000-0000-0000-0000-000000000001"),
        name: "Lima",
      },
    });

    expect(label).toBe("Equipo de Diego");
  });

  it("renders supervisor label from team name", () => {
    const label = getWorkspaceLabel({
      role: "supervisor",
      names: "Diego",
      scopeType: "team",
      team: {
        id: asTeamId("00000000-0000-0000-0000-000000000001"),
        name: "Alpha",
      },
      supervisor: null,
      branch: {
        id: asBranchId("00000000-0000-0000-0000-000000000001"),
        name: "Lima",
      },
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
      branch: {
        id: asBranchId("00000000-0000-0000-0000-000000000001"),
        name: "Lima",
      },
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
