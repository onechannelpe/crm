import { parseGpvSnapshotProgressMessage } from "~/contracts/merchant-stats/imports";
import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import { hasPermission } from "~/domain/auth/access/rbac";
import { GpvSnapshotJobId } from "~/domain/ids";
import { application } from "~/server/platform/composition/application";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import { defineRealtimeChannel } from "~/server/realtime/channel";
import { isErr } from "~/shared/result";

export const gpvSnapshotChannel = defineRealtimeChannel({
  name: REALTIME_CHANNELS.gpvSnapshot,
  pgChannel: GPV_SNAPSHOT_PROGRESS_CHANNEL,

  parseId: (raw) => {
    const parsed = GpvSnapshotJobId.parse(raw);

    return isErr(parsed) ? null : parsed.value;
  },

  open: async (session, jobId) => {
    if (!hasPermission(session.role, "dashboards:read")) {
      return null;
    }

    const progress = await application.merchantStats.imports.progress(jobId);

    return progress ? [{ data: JSON.stringify(progress) }] : null;
  },

  topicIdOfPayload: (payload) =>
    parseGpvSnapshotProgressMessage(payload)?.jobId ?? null,
});
