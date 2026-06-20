import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import type { LeadEvent } from "~/server/workflow/domain/lead/events";
import type { LeadState } from "~/server/workflow/domain/lead/state";

import { createLeadUow } from "../infrastructure/uow";
import {
  createWorkflowRepos,
  type WorkflowRepos,
} from "../infrastructure/workflow-repos";
import type { CommitInput, CommitResult } from "./ports/uow";

export type LeadTransition = { next: LeadState; events: LeadEvent[] };

export type LeadTransaction = {
  tx: DatabaseExecutor;
  repos: WorkflowRepos;
  now: number;
  commit(
    transition: LeadTransition,
    assignment?: CommitInput["assignment"],
  ): Promise<Result<CommitResult, DomainError>>;
};

/**
 * Single owner of the lead mutation envelope. Opens one transaction, builds the
 * tx-scoped repositories, stamps one `now`, and commits the unit of work under a
 * fresh idempotency key. Command bodies keep only their use-case logic: load the
 * aggregate, run the domain transition, write persistence, commit.
 *
 * Returning an `Err` from the body resolves the transaction (it commits with no
 * mutation rather than rolling back), matching how every lead command already
 * surfaces domain failures.
 */
export function runLeadTransaction<O>(
  ports: { executor: DatabaseExecutor; now: number },
  body: (ctx: LeadTransaction) => Promise<Result<O, DomainError>>,
): Promise<Result<O, DomainError>> {
  return ports.executor.transaction().execute((tx) =>
    body({
      tx,
      repos: createWorkflowRepos(tx),
      now: ports.now,
      commit: (transition, assignment) =>
        createLeadUow(tx).commit({
          next: transition.next,
          events: transition.events,
          idempotencyKey: randomUUIDv7(),
          assignment,
        }),
    }),
  );
}
