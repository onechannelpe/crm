import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import { parseRecordImportProgressMessage } from "~/contracts/records/imports";
import { hasPermission } from "~/domain/auth/access/rbac";
import { IntegrationJobId } from "~/domain/ids";
import { defineRealtimeChannel } from "~/server/realtime/channel";
import { isErr } from "~/shared/result";

import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "./progress-events";
import { buildRecordImportProgressEvent } from "./progress-events";
import type { createRecordImportsRuntime } from "./runtime";

export function createRecordImportChannel(
  recordImports: Pick<
    ReturnType<typeof createRecordImportsRuntime>,
    "find" | "canAccess"
  >,
) {
  return defineRealtimeChannel({
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

      const job = await recordImports.find(jobId);

      if (!job) {
        return null;
      }

      const canAccess = await recordImports.canAccess(
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
}
