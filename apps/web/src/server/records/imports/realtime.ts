import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import { parseRecordImportProgressMessage } from "~/contracts/records/imports";
import { hasPermission } from "~/domain/auth/access/rbac";
import { IntegrationJobId } from "~/domain/ids";
import { application } from "~/server/platform/composition/application";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import { defineRealtimeChannel } from "~/server/realtime/channel";
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

    const job = await application.integration.records.find(jobId);

    if (!job) {
      return null;
    }

    const canAccess = await application.integration.records.canAccess(
      {
        userId: session.userId,
        branchId: session.branchId,
        role: session.role,
      },
      job,
    );

    if (!canAccess) {
      return null;
    }

    return [{ data: JSON.stringify(buildRecordImportProgressEvent(job)) }];
  },

  topicIdOfPayload: (payload) =>
    parseRecordImportProgressMessage(payload)?.jobId ?? null,
});
