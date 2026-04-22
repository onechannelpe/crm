import {
  parseLeadImportTopic,
  leadImportTopic,
} from "~/features/leads-imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { canAccessLeadImportJob } from "~/server/leads/imports/api";
import { buildLeadImportProgressEvent } from "~/server/leads/imports/progress-events";
import {
  ensureLeadImportsRealtimeBridge,
  getLeadImportsTopicHub,
} from "~/server/leads/imports/realtime";
import { getServerRuntime } from "~/server/runtime";

import { createTopicSubscriptionWsHandler } from "./core/ws-handler-factory";

export default createTopicSubscriptionWsHandler<number>({
  hub: getLeadImportsTopicHub(),
  canOpen: (session) =>
    session.sessionClass === "app" &&
    session.onboardingCompleted &&
    hasPermission(session.role, "integration:manage"),
  parseTopic: parseLeadImportTopic,
  topicFromKey: leadImportTopic,
  async authorizeSubscribe(session, jobId) {
    await ensureLeadImportsRealtimeBridge();

    const job =
      await getServerRuntime().integrations.integration.jobs.findById(jobId);
    if (
      !job ||
      (job.type !== "import_status" && job.type !== "import_prioridad")
    ) {
      return false;
    }

    return canAccessLeadImportJob(
      {
        userId: session.userId,
        branchId: session.branchId,
        role: session.role,
      },
      job,
      getServerRuntime().integrations.integration,
    );
  },
  async initialPayload(_session, jobId) {
    const job =
      await getServerRuntime().integrations.integration.jobs.findById(jobId);
    if (
      !job ||
      (job.type !== "import_status" && job.type !== "import_prioridad")
    ) {
      return null;
    }

    return JSON.stringify(buildLeadImportProgressEvent({ job }));
  },
});
