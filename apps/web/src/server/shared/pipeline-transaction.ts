import { db } from "~/lib/db/db";

import type { DatabaseExecutor } from "./db-executor";

export type AfterCommitEffect = () => Promise<void>;

export interface PipelineTransaction {
  executor: DatabaseExecutor;
  afterCommit: (effect: AfterCommitEffect) => void;
}

export async function runInPipelineTransaction<T>(
  operation: (transaction: PipelineTransaction) => Promise<T>,
): Promise<T> {
  const afterCommitEffects: AfterCommitEffect[] = [];
  const result = await db.transaction().execute((trx) =>
    operation({
      executor: trx,
      afterCommit(effect) {
        afterCommitEffects.push(effect);
      },
    }),
  );
  await Promise.all(afterCommitEffects.map((effect) => effect()));
  return result;
}
