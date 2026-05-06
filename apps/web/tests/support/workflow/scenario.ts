import type { TestRuntime } from "../runtime/app";
import { createWorkflowImporter } from "./importer";
import { createWorkflowLeadApis } from "./leads";
import { createWorkflowOutbox } from "./outbox";

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

  const notifications = {
    async list() {
      return runtime.ctx.db
        .selectFrom("app_notifications")
        .select(["user_id", "event_type", "dedupe_key"])
        .orderBy("id", "asc")
        .execute();
    },
  };

  return {
    actor: leadApis.actor,
    lead: leadApis.lead,
    job: imported.job,
    importer: imported.importer,
    outbox,
    notifications,
    user: leadApis.user,
  };
}
