import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, type Result } from "~/server/shared/result";
import { enqueueLeadEffects } from "~/server/workflow/effects/enqueue-lead-effects";
import type { LeadHistoryEventDraft } from "~/server/workflow/lead/domain/history";
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

export type CommittedLeadEvent = { event: LeadHistoryEventDraft; id: string };

export type LeadTransaction = {
  tx: DatabaseExecutor;
  repos: WorkflowRepos;
  now: Date;
  commitTransition(
    transition: LeadTransition,
    assignment?: LeadAssignment,
  ): Promise<Result<{ eventIds: string[] }, DomainError>>;
  appendFacts(
    events: LeadHistoryEventDraft[],
  ): Promise<Result<{ eventIds: string[] }, DomainError>>;
};

// Carries a domain failure out of the Kysely transaction so the executor rolls
// back. The runner unwraps it back into an `Err`; any other throw is a genuine
// fault and propagates to the action fault boundary.
class LeadTransactionRollback {
  constructor(readonly error: DomainError) {}
}

function zip(
  events: LeadHistoryEventDraft[],
  ids: string[],
): CommittedLeadEvent[] {
  return events.map((event, index) => ({ event, id: ids[index] }));
}

export function runLeadTransaction<O>(
  ports: { executor: DatabaseExecutor; now: Date },
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

      // Effects share the transaction with source events to prevent orphaned delivery.
      await enqueueLeadEffects(tx, committed, ports.now);
      return result;
    })
    .catch((error: unknown) => {
      if (error instanceof LeadTransactionRollback) return Err(error.error);
      throw error;
    });
}
