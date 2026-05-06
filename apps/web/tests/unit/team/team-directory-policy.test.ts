import { makeActor, makeAppContext } from "@tests/support/unit/factories";
import { describe, expect, it } from "vitest";

import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok } from "~/server/shared/result";
import { getInviteManagement } from "~/server/team/application/invites";
import type { InviteManagementQueryPort } from "~/server/team/application/ports";

const HR_USER_ID = 7 as UserId;
const HR_BRANCH_ID = 3 as BranchId;

function makeHrContext() {
  return makeAppContext({
    actor: makeActor({
      userId: HR_USER_ID,
      role: "hr",
      branchId: HR_BRANCH_ID,
    }),
  });
}

describe("getInviteManagement", () => {
  it("returns teams, pending invites, and assignable roles for the actor branch", async () => {
    const teamBranchCalls: number[] = [];
    const inviteBranchCalls: number[] = [];

    const port = {
      listTeamsByBranch: async (branchId: number) => {
        teamBranchCalls.push(branchId);
        return [{ id: 11, name: "Operaciones" }];
      },
      listPendingInvites: async (branchId: number) => {
        inviteBranchCalls.push(branchId);
        return Ok([
          {
            inviteId: 1001,
            userId: 91,
            email: "pending@crm.local",
            names: "Pending",
            firstSurname: "User",
            secondSurname: "",
            role: "executive",
            teamId: null,
            expiresAt: 1_700_000_060_000,
            createdAt: 1_700_000_000_000,
            createdByUserId: 7,
            sentAt: 1_700_000_000_100,
          },
        ]);
      },
    } satisfies InviteManagementQueryPort;

    const result = await getInviteManagement(makeHrContext(), port);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const value = result.value;

    expect(teamBranchCalls).toEqual([3]);
    expect(inviteBranchCalls).toEqual([3]);
    expect(value.teams).toEqual([{ id: 11, name: "Operaciones" }]);
    expect(value.pendingInvites).toEqual([
      expect.objectContaining({
        inviteId: 1001,
        email: "pending@crm.local",
      }),
    ]);
    expect(value.assignableRoles).toEqual([
      { value: "executive", label: "Ejecutivo" },
      { value: "supervisor", label: "Supervisor" },
      { value: "back_office", label: "Validación de ventas" },
      { value: "sales_manager", label: "Gerente de ventas" },
      { value: "logistics", label: "Logística" },
      { value: "hr", label: "RRHH" },
    ]);
  });

  it("propagates provisioning errors without masking them", async () => {
    const port = {
      listTeamsByBranch: async () => [{ id: 11, name: "Operaciones" }],
      listPendingInvites: async () =>
        Err({
          kind: "external" as const,
          code: "invite_read_failed",
          message: "Invite service unavailable",
        }),
    } satisfies InviteManagementQueryPort;

    const result = await getInviteManagement(makeHrContext(), port);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("invite_read_failed");
  });
});
