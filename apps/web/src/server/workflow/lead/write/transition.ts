import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, type Result } from "~/server/shared/result";
import { enqueueLeadEffects } from "~/server/workflow/effects/enqueue-lead-effects";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import {
  createWorkflowRepos,
  type WorkflowRepos,
} from "~/server/workflow/repos";

import {
  appendFacts,
  commitTransition,
  type LeadAssignment,
  type LeadTransition,
} from "./commit";

export type CommittedLeadEvent = { event: LeadEvent; id: string };

export type LeadTransaction = {
  tx: DatabaseExecutor;
  repos: WorkflowRepos;
  now: number;
  // Version-locked lifecycle commit. Use for state transitions.
  commitTransition(
    transition: LeadTransition,
    assignment?: LeadAssignment,
  ): Promise<Result<{ eventIds: string[] }, DomainError>>;
  // Append-only timeline facts. No version lock. Use for notes/calls/registration.
  appendFacts(
    events: LeadEvent[],
  ): Promise<Result<{ eventIds: string[] }, DomainError>>;
};

// Carries a domain failure out of the Kysely transaction so the executor rolls
// back. The runner unwraps it back into an `Err`; any other throw is a genuine
// fault and propagates to the action fault boundary.
class LeadTransactionRollback {
  constructor(readonly error: DomainError) {}
}

function zip(events: LeadEvent[], ids: string[]): CommittedLeadEvent[] {
  return events.map((event, index) => ({ event, id: ids[index] }));
}

/**
 * Single owner of the lead mutation envelope. Opens one transaction, builds the
 * tx-scoped repositories, stamps one `now`, and runs the command body. The body
 * loads the aggregate, runs the pure transition, writes child rows, and records
 * events through `commitTransition` (version-locked) or `appendFacts`.
 *
 * Every event recorded through this runner is accumulated and, once the body
 * succeeds, fed to `enqueueLeadEffects` inside the same transaction. Effects
 * (notifications, enrichment) are therefore impossible to forget and atomic with
 * the write that produced them.
 *
 * Any `Err` the body returns rolls the transaction back, so a command that has
 * already written a child row leaves nothing behind when a later step fails.
 */
export function runLeadTransaction<O>(
  ports: { executor: DatabaseExecutor; now: number },
  body: (ctx: LeadTransaction) => Promise<Result<O, DomainError>>,
): Promise<Result<O, DomainError>> {
  return ports.executor
    .transaction()
    .execute(async (tx): Promise<Result<O, DomainError>> => {
      const committed: CommittedLeadEvent[] = [];

      const result = await body({
        tx,
        repos: createWorkflowRepos(tx),
        now: ports.now,
        commitTransition: async (transition, assignment) => {
          const outcome = await commitTransition(tx, transition, assignment);
          if (outcome.ok) {
            committed.push(...zip(transition.events, outcome.value.eventIds));
          }
          return outcome;
        },
        appendFacts: async (events) => {
          const outcome = await appendFacts(tx, events, ports.now);
          if (outcome.ok)
            committed.push(...zip(events, outcome.value.eventIds));
          return outcome;
        },
      });

      if (isErr(result)) throw new LeadTransactionRollback(result.error);

      await enqueueLeadEffects(tx, committed, ports.now);
      return result;
    })
    .catch((error: unknown) => {
      if (error instanceof LeadTransactionRollback) return Err(error.error);
      throw error;
    });
}
