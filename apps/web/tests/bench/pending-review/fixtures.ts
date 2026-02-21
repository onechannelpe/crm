import {
  assertPendingReviewRows,
  createPendingReviewWorkload,
  readPendingReviewRows,
  seedPendingReviewWorkload,
} from "../../support/pending-review-workload";
import type { TestDbContext } from "../../support/test-db";

export const QUERY_ITERATIONS = 96;
export const pendingReviewWorkload = createPendingReviewWorkload(1_200);

export async function seedPendingReviewFixtures(
  ctx: TestDbContext,
): Promise<void> {
  await seedPendingReviewWorkload(ctx, pendingReviewWorkload);
  assertPendingReviewRows(
    await readPendingReviewRows(ctx),
    pendingReviewWorkload,
  );
}
