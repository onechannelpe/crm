import type { TestDbContext } from "../../support/test-db";

export interface PendingReviewWorkload {
  totalNotes: number;
  expectedBranchOne: number;
  expectedBranchTwo: number;
  expectedTotal: number;
}

export interface PendingReviewRows {
  branchOneRows: Awaited<
    ReturnType<
      TestDbContext["repos"]["chargeNotes"]["findPendingReviewWithContactsByBranch"]
    >
  >;
  branchTwoRows: Awaited<
    ReturnType<
      TestDbContext["repos"]["chargeNotes"]["findPendingReviewWithContactsByBranch"]
    >
  >;
}

const FIXED_NOW = 1_700_000_000_000;
const ORG_ID = 3;
const CONTACT_ID_BASE = 1_000;

export function createPendingReviewWorkload(
  totalNotes: number,
): PendingReviewWorkload {
  if (
    !Number.isInteger(totalNotes) ||
    totalNotes <= 0 ||
    totalNotes % 2 !== 0
  ) {
    throw new Error("pending review workload requires a positive even total");
  }

  return {
    totalNotes,
    expectedBranchOne: totalNotes / 2,
    expectedBranchTwo: totalNotes / 2,
    expectedTotal: totalNotes,
  };
}

export async function seedPendingReviewWorkload(
  ctx: TestDbContext,
  workload: PendingReviewWorkload,
): Promise<void> {
  await ctx.db
    .insertInto("organizations")
    .values({
      id: ORG_ID,
      ruc: "20100000999",
      name: "Org Perf",
      locked_branch_id: null,
      locked_at: null,
      locked_by_user_id: null,
      created_at: FIXED_NOW,
    })
    .execute();

  const contacts: Array<{
    id: number;
    organization_id: number;
    dni: string;
    name: string;
    phone_primary: string | null;
    phone_secondary: string | null;
    last_contacted_at: number | null;
    last_contacted_by_user_id: number | null;
    cooldown_until: number | null;
    created_at: number;
  }> = [];
  const notes: Array<{
    contact_id: number;
    user_id: number;
    status: "pending_review";
    created_at: number;
    updated_at: number;
    exec_code_real: string | null;
    exec_code_tdp: string | null;
  }> = [];

  for (let index = 0; index < workload.totalNotes; index++) {
    const contactId = CONTACT_ID_BASE + index;
    contacts.push({
      id: contactId,
      organization_id: ORG_ID,
      dni: `7${(1_000_000 + index).toString().slice(0, 7)}`,
      name: `Perf Contact ${index}`,
      phone_primary: null,
      phone_secondary: null,
      last_contacted_at: null,
      last_contacted_by_user_id: null,
      cooldown_until: null,
      created_at: FIXED_NOW,
    });
    notes.push({
      contact_id: contactId,
      user_id: index % 2 === 0 ? 1 : 3,
      status: "pending_review",
      created_at: FIXED_NOW,
      updated_at: FIXED_NOW,
      exec_code_real: null,
      exec_code_tdp: null,
    });
  }

  await ctx.db.insertInto("contacts").values(contacts).execute();
  await ctx.db.insertInto("charge_notes").values(notes).execute();
}

export async function readPendingReviewRows(
  ctx: TestDbContext,
): Promise<PendingReviewRows> {
  const [branchOneRows, branchTwoRows] = await Promise.all([
    ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(1),
    ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(2),
  ]);

  return { branchOneRows, branchTwoRows };
}

export function assertPendingReviewRows(
  rows: PendingReviewRows,
  workload: PendingReviewWorkload,
): void {
  if (rows.branchOneRows.length !== workload.expectedBranchOne) {
    throw new Error(
      `expected ${workload.expectedBranchOne} branch 1 rows, got ${rows.branchOneRows.length}`,
    );
  }
  if (rows.branchTwoRows.length !== workload.expectedBranchTwo) {
    throw new Error(
      `expected ${workload.expectedBranchTwo} branch 2 rows, got ${rows.branchTwoRows.length}`,
    );
  }

  const branchOneIds = new Set(rows.branchOneRows.map((row) => row.id));
  for (const row of rows.branchTwoRows) {
    if (branchOneIds.has(row.id)) {
      throw new Error(`duplicate note id found across branches: ${row.id}`);
    }
  }
}
