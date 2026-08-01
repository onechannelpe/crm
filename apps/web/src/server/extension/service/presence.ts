import type { BranchId, UserId } from "~/domain/ids";
import { epochMilliseconds } from "~/domain/time/clock";

import type {
  ExtensionExecutivePresenceStatus,
  ExtensionRuntimeEventEnvelope,
  ExtensionSyncHealth,
  TeamExecutiveStatusView,
} from "../contracts";
import type { ExtensionRuntimeRepo } from "../repos";

const EXECUTIVE_STATUS_OFFLINE_AFTER_MS = 2 * 60_000;
const EXECUTIVE_SYNC_STALE_AFTER_MS = 2 * 60_000;

export function mapLifecycleStatus(
  event: Extract<ExtensionRuntimeEventEnvelope, { type: "call.lifecycle" }>,
): Exclude<ExtensionExecutivePresenceStatus, "idle" | "ready" | "offline"> {
  switch (event.payload.event) {
    case "started":
      return "dialing";
    case "connected":
      return "active";
    case "ended":
      return "wrap_up";
  }

  throw new Error("Unsupported lifecycle event");
}

export function withDerivedProjectionStatuses(
  statuses: Awaited<ReturnType<ExtensionRuntimeRepo["listBranchStatuses"]>>,
  now: Date,
): TeamExecutiveStatusView[] {
  const nowMs = now.getTime();

  return statuses.map((status) => {
    const presenceUpdatedAt = status.presenceUpdatedAt
      ? epochMilliseconds(status.presenceUpdatedAt)
      : null;
    const syncUpdatedAt = status.syncUpdatedAt
      ? epochMilliseconds(status.syncUpdatedAt)
      : null;

    return {
      userId: status.userId,
      names: status.names,
      firstSurname: status.firstSurname,
      teamId: status.teamId,
      teamName: status.teamName,
      assignmentId: status.assignmentId,
      contactId: status.contactId,
      callSessionId: status.callSessionId,
      presenceUpdatedAt,
      syncUpdatedAt,
      presenceStatus:
        status.presenceStatus === null ||
        status.presenceUpdatedAt === null ||
        nowMs - status.presenceUpdatedAt.getTime() <
          EXECUTIVE_STATUS_OFFLINE_AFTER_MS
          ? status.presenceStatus
          : "offline",
      syncHealth:
        status.syncHealth === "reauth_required" ||
        (status.syncUpdatedAt !== null &&
          nowMs - status.syncUpdatedAt.getTime() <
            EXECUTIVE_SYNC_STALE_AFTER_MS)
          ? status.syncHealth
          : "stale",
    };
  });
}

export async function upsertSyncHealth(
  extensionRuntime: ExtensionRuntimeRepo,
  values: {
    userId: UserId;
    branchId: BranchId;
    syncHealth: ExtensionSyncHealth;
    updatedAt: Date;
  },
): Promise<void> {
  await extensionRuntime.upsertExecutiveSyncHealth({
    user_id: values.userId,
    branch_id: values.branchId,
    sync_health: values.syncHealth,
    sync_updated_at: values.updatedAt,
  });
}
