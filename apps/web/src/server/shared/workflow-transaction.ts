import { getServerRuntime } from "~/server/runtime";

import type { DatabaseExecutor } from "./db-executor";

export type AfterCommitEffect = () => Promise<void>;

export interface WorkflowTransaction {
  executor: DatabaseExecutor;
  afterCommit: (effect: AfterCommitEffect) => void;
}

export async function runInWorkflowTransaction<T>(
  operation: (transaction: WorkflowTransaction) => Promise<T>,
): Promise<T> {
  const afterCommitEffects: AfterCommitEffect[] = [];
  const result = await getServerRuntime()
    .infra.db.transaction()
    .execute((trx) =>
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
