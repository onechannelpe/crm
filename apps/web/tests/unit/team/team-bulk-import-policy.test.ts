import { makeAppContext, makeAuthSession } from "@tests/support/unit/factories";
import { describe, expect, it } from "vitest";

import type { InviteService } from "~/server/invites/application/types";
import { applyBulkImport } from "~/server/team/application/bulk-import";
import type { InviteDelivery } from "~/server/team/application/ports";
import type { TeamBulkImportContext } from "~/server/team/infrastructure/invite-context";
import { isErr } from "~/shared/result";

// Throw if authorization does not happen before invite side effects.
function untouchedDeps(): TeamBulkImportContext {
  const throwing = (method: string) => (): never => {
    throw new Error(`${method} must not be called before the role check`);
  };

  const inviteService: InviteService = {
    listPendingInvites: throwing("listPendingInvites"),
    createInvite: throwing("createInvite"),
    redeliverInvite: throwing("redeliverInvite"),
    revokeInvite: throwing("revokeInvite"),
    markInviteDelivered: throwing("markInviteDelivered"),
    acceptInvite: throwing("acceptInvite"),
  };

  const delivery: InviteDelivery = {
    send: throwing("send"),
  };

  return {
    inviteService,
    delivery,
    publicOrigin: "http://localhost:3000",
  };
}

describe("bulk import role authorization", () => {
  it("rejects an unassignable role before touching invite dependencies", async () => {
    const ctx = makeAppContext({
      actor: makeAuthSession({ role: "sales_manager" }),
    });

    const result = await applyBulkImport(ctx, untouchedDeps(), {
      csvContent: "irrelevant for this check",
      role: "admin",
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error.code).toBe("role_not_assignable");
  });

  it("allows an assignable role past the role check", async () => {
    const ctx = makeAppContext({
      actor: makeAuthSession({ role: "sales_manager" }),
    });

    const result = await applyBulkImport(ctx, untouchedDeps(), {
      csvContent: "",
      role: "executive",
    });

    expect(isErr(result)).toBe(true);

    if (!isErr(result)) {
      return;
    }

    expect(result.error.code).toBe("team.bulk_import.csv_invalid");
  });
});
