import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";

import type { TestRuntime } from "../runtime/app";

export function createWorkflowOutbox(runtime: TestRuntime) {
  const outbox = {
    async counts(status: "pending" | "completed") {
      const needsExecutive = await runtime.ctx.db
        .selectFrom("workflow_integration_outbox_needs_executive_input")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      const readyForQuotation = await runtime.ctx.db
        .selectFrom("workflow_integration_outbox_ready_for_quotation")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      return {
        needsExecutive: needsExecutive.count,
        readyForQuotation: readyForQuotation.count,
      };
    },

    async drainAll(workerId = "test-worker"): Promise<void> {
      const needsExecutiveQueue = createNeedsExecutiveOutboxQueue(workerId, {
        executor: runtime.integrations.executor,
      });
      const readyForQuotationQueue = createReadyForQuotationOutboxQueue(
        workerId,
        { executor: runtime.integrations.executor },
      );

      for (let index = 0; index < 5; index += 1) {
        await needsExecutiveQueue.runOnce();
        await readyForQuotationQueue.runOnce();
        const pending = await outbox.counts("pending");
        if (pending.needsExecutive === 0 && pending.readyForQuotation === 0) {
          return;
        }
      }
    },
  };
  return outbox;
}
