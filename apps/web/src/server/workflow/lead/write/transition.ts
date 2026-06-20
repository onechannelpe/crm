import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, type Result } from "~/server/shared/result";
import {
  createWorkflowRepos,
  type WorkflowRepos,
} from "~/server/workflow/repos";

import {
  commitTransition,
  type LeadAssignment,
  type LeadTransition,
} from "./commit";

export type LeadTransaction = {
  tx: DatabaseExecutor;
  repos: WorkflowRepos;
  now: number;
  commit(
    transition: LeadTransition,
    assignment?: LeadAssignment,
  ): Promise<Result<{ eventIds: string[] }, DomainError>>;
};

// Carries a domain failure out of the Kysely transaction so the executor rolls
// back. The runner unwraps it back into an `Err`; any other throw is a genuine
// fault and propagates to the action fault boundary.
class LeadTransactionRollback {
  constructor(readonly error: DomainError) {}
}

/**
 * Single owner of the lead mutation envelope. Opens one transaction, builds the
 * tx-scoped repositories, stamps one `now`, and runs the command body. The body
 * loads the aggregate, runs the pure transition, writes child rows, and calls
 * `commit`.
 *
 * Any `Err` the body returns rolls the transaction back, so a command that has
 * already written a child row (a marked proposal, an inserted revision) leaves
 * nothing behind when a later step (including the optimistic-concurrency check
 * in `commit`) fails. The `Err` is still returned to the caller unchanged.
 */
export function runLeadTransaction<O>(
  ports: { executor: DatabaseExecutor; now: number },
  body: (ctx: LeadTransaction) => Promise<Result<O, DomainError>>,
): Promise<Result<O, DomainError>> {
  return ports.executor
    .transaction()
    .execute(async (tx): Promise<Result<O, DomainError>> => {
      const result = await body({
        tx,
        repos: createWorkflowRepos(tx),
        now: ports.now,
        commit: (transition, assignment) =>
          commitTransition(tx, transition, ports.now, assignment),
      });
      if (isErr(result)) throw new LeadTransactionRollback(result.error);
      return result;
    })
    .catch((error: unknown) => {
      if (error instanceof LeadTransactionRollback) return Err(error.error);
      throw error;
    });
}
