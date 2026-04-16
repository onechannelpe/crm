import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";

import type { TransactionRunner } from "../../ports/transaction-runner";

export const pipelineTransactionRunner: TransactionRunner = {
  runInTransaction(operation) {
    return runInPipelineTransaction(async () => operation());
  },
};
