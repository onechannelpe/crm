import {
  parseRecordImportTopic,
  recordImportTopic,
} from "~/features/records-imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import { buildRecordImportProgressEvent } from "~/server/records/imports/progress-events";
import {
  ensureRecordImportsRealtimeBridge,
  getRecordImportsTopicHub,
} from "~/server/records/imports/realtime";
import { getServerRuntime } from "~/server/runtime";

import { createTopicSubscriptionWsHandler } from "./core/ws-handler-factory";

export default createTopicSubscriptionWsHandler<string>({
  hub: getRecordImportsTopicHub(),
  canOpen: (session) =>
    session.sessionClass === "app" &&
    session.onboardingCompleted &&
    hasPermission(session.role, "integration:manage"),
  parseTopic: parseRecordImportTopic,
  topicFromKey: recordImportTopic,
  async authorizeSubscribe(session, jobId) {
    await ensureRecordImportsRealtimeBridge();

    const job =
      await getServerRuntime().integrations.integration.jobs.findById(jobId);
    if (
      !job ||
      (job.type !== "import_status" && job.type !== "import_prioridad")
    ) {
      return false;
    }

    return canAccessRecordImportJob(
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

    return JSON.stringify(buildRecordImportProgressEvent({ job }));
  },
});
