import { parseGpvSnapshotProgressMessage } from "~/contracts/merchant-stats/imports";
import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import { hasPermission } from "~/domain/auth/access/rbac";
import { GpvSnapshotJobId } from "~/domain/ids";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import { defineRealtimeChannel } from "~/server/realtime/channel";
import { isErr } from "~/shared/result";

import type { createMerchantStatsRuntime } from "../infrastructure/runtime";

export function createGpvSnapshotChannel(
  merchantStats: Pick<ReturnType<typeof createMerchantStatsRuntime>, "imports">,
) {
  return defineRealtimeChannel({
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

      const progress = await merchantStats.imports.progress(jobId);

      return progress ? [{ data: JSON.stringify(progress) }] : null;
    },

    topicIdOfPayload: (payload) =>
      parseGpvSnapshotProgressMessage(payload)?.jobId ?? null,
  });
}
