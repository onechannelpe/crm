import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  actorWithRole,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { workflowRepos } from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";

describe("workflow read access", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-read-access");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(10));
  });

  it("lets review users read record detail even when they are not the assigned executive", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "read-access-back-office",
      organization: { key: "read-access-back-office" },
    });

    const actor = actorBy("backOne");
    const result = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId: lead.id,
      evaluatedAt: runtime.now.get(),
    });

    const value = expectOk(result);
    expect(value.lead.id).toBe(lead.id);
    expect(value.timeline).toEqual([]);
  });

  it.each(["supervisor", "sales_manager"] as const)(
    "lets %s read record detail even when they are not the assigned executive",
    async (role) => {
      const lead = await createLeadFixtureWriter(runtime)({
        kind: "pricing",
        key: `read-access-${role}`,
        organization: { key: `read-access-${role}` },
        proposal: "none",
      });

      const actor = actorWithRole("backOne", role);
      const result = await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
        evaluatedAt: runtime.now.get(),
      });

      const value = expectOk(result);
      expect(value.lead.id).toBe(lead.id);
    },
  );

  it("blocks executives from reading another executive's record detail", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "read-access-exec-blocked",
      organization: { key: "read-access-exec-blocked" },
    });

    const actor = actorBy("execTwo");
    const result = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId: lead.id,
      evaluatedAt: runtime.now.get(),
    });

    const error = expectErr(result);
    expect(error.kind).toBe("forbidden");
  });
});
