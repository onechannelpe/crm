import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import { parseRecordImportProgressMessage } from "~/contracts/records/imports";
import { hasPermission } from "~/domain/auth/access/rbac";
import { IntegrationJobId } from "~/domain/ids";
import { composeIntegrations } from "~/server/integrations/ui/composition";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import { defineRealtimeChannel } from "~/server/realtime/channel";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import { isErr } from "~/shared/result";

import { buildRecordImportProgressEvent } from "./progress-events";

export const recordImportChannel = defineRealtimeChannel({
  name: REALTIME_CHANNELS.recordImport,
  pgChannel: RECORDS_IMPORT_PROGRESS_CHANNEL,

  parseId: (raw) => {
    const parsed = IntegrationJobId.parse(raw);

    return isErr(parsed) ? null : parsed.value;
  },

  // The job provides both access control and the initial progress snapshot.
  open: async (session, jobId) => {
    if (!hasPermission(session.role, "integration:manage")) {
      return null;
    }

    const { integration } = composeIntegrations();
    const job = await integration.jobs.findById(jobId);

    if (!job) {
      return null;
    }

    const canAccess = await canAccessRecordImportJob(
      {
        userId: session.userId,
        branchId: session.branchId,
        role: session.role,
      },
      job,
      integration,
    );

    if (!canAccess) {
      return null;
    }

    return [{ data: JSON.stringify(buildRecordImportProgressEvent(job)) }];
  },

  topicIdOfPayload: (payload) =>
    parseRecordImportProgressMessage(payload)?.jobId ?? null,
});
