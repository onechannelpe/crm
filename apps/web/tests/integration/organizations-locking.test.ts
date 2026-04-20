import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asBranchId, asOrganizationId, asUserId } from "~/server/shared/ids";

import { TEST_IDS } from "../support/identities/seeded-identities";
import { createOrganizationTestKit } from "../support/organization-test-kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("organization branch locking", () => {
  let ctx: TestDbContext;
  let kit: ReturnType<typeof createOrganizationTestKit>;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("org-locking");
    kit = createOrganizationTestKit(ctx);
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("findUnlockedOrLockedToBranch isolates organizations by lock owner", async () => {
    const now = Date.now();
    const branch1 = TEST_IDS.BRANCH_LIMA;
    const branch2 = TEST_IDS.BRANCH_NORTE;
    const org1 = TEST_IDS.ORG_LIMA;
    const org2 = TEST_IDS.ORG_NORTE;

    await kit.setupManualLock(org1, branch1, undefined, now);
    await kit.setupManualLock(org2, branch2, undefined, now);

    const branch1Visible = await kit.findVisibleToBranch(branch1);
    const branch2Visible = await kit.findVisibleToBranch(branch2);

    expect(branch1Visible.map((x) => x.id)).toContain(org1);
    expect(branch1Visible.map((x) => x.id)).not.toContain(org2);
    expect(branch2Visible.map((x) => x.id)).toContain(org2);
    expect(branch2Visible.map((x) => x.id)).not.toContain(org1);
  });

  it("lockToBranch persists lock metadata", async () => {
    const org1 = TEST_IDS.ORG_LIMA;
    const branch2 = TEST_IDS.BRANCH_NORTE;

    await kit.lockToBranch(org1, branch2);
    const org = await kit.findById(org1);

    expect(org?.locked_branch_id).toBe(branch2);
    expect((org?.locked_at ?? 0) > 0).toBe(true);
  });
});
