import type { TestRuntime } from "../runtime/app";
import { createLeadBuilder } from "./build-lead";
import { createWorkflowImporter } from "./importer";
import { createWorkflowLeadApis } from "./leads";
import { createWorkflowOutbox } from "./outbox";
import { seedRateProposal } from "./seed";

export function createWorkflowScenario(runtime: TestRuntime) {
  const leadApis = createWorkflowLeadApis(runtime);
  const imported = createWorkflowImporter({
    runtime,
    resolveActorUserId(actor) {
      return typeof actor === "number"
        ? actor
        : leadApis.actor.by(actor).userId;
    },
    nextJobKey(key) {
      return leadApis.ids.nextJobKey(key);
    },
  });
  const outbox = createWorkflowOutbox(runtime);

  const lead = createLeadBuilder({
    runtime,
    resolveActor: (key) => leadApis.actor.by(key),
    importer: imported.importer,
  });

  const seedDirect = {
    leadAt: (...args: Parameters<typeof leadApis.seedDirectLead.at>) =>
      leadApis.seedDirectLead.at(...args),
    rateProposal: (input: Parameters<typeof seedRateProposal>[1]) =>
      seedRateProposal(runtime, input),
  };

  const notifications = {
    async list() {
      return runtime.ctx.db
        .selectFrom("app_notifications")
        .select(["user_id", "event_type", "source_event_id"])
        .orderBy("id", "asc")
        .execute();
    },
  };

  return {
    actor: leadApis.actor,
    lead,
    seedDirect,
    job: imported.job,
    importer: imported.importer,
    outbox,
    notifications,
    user: leadApis.user,
  };
}
