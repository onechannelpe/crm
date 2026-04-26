import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import { getServerRuntime } from "~/server/runtime";

export type AfterCommitEffect = () => Promise<void>;

export interface WorkflowTransaction {
  executor: Transaction<Database>;
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
