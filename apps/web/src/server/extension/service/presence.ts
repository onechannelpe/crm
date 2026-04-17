import type {
  ExtensionExecutivePresenceStatus,
  ExtensionRuntimeEventEnvelope,
  ExtensionSyncHealth,
  TeamExecutiveStatusView,
} from "../contracts";
import type { createExtensionRuntimeRepo } from "../repos";
import type { BranchId, UserId } from "~/server/shared/ids";

export const EXECUTIVE_STATUS_OFFLINE_AFTER_MS = 2 * 60_000;
export const EXECUTIVE_SYNC_STALE_AFTER_MS = 2 * 60_000;

type ExtensionRuntimeRepo = ReturnType<typeof createExtensionRuntimeRepo>;

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
  statuses: TeamExecutiveStatusView[],
  now: number,
): TeamExecutiveStatusView[] {
  return statuses.map((status) => {
    return {
      ...status,
      presenceStatus:
        status.presenceStatus === null ||
        status.presenceUpdatedAt === null ||
        now - status.presenceUpdatedAt < EXECUTIVE_STATUS_OFFLINE_AFTER_MS
          ? status.presenceStatus
          : "offline",
      syncHealth:
        status.syncHealth === "reauth_required" ||
        (status.syncUpdatedAt !== null &&
          now - status.syncUpdatedAt < EXECUTIVE_SYNC_STALE_AFTER_MS)
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
    updatedAt: number;
  },
): Promise<void> {
  await extensionRuntime.upsertExecutiveSyncHealth({
    user_id: values.userId,
    branch_id: values.branchId,
    sync_health: values.syncHealth,
    sync_updated_at: values.updatedAt,
  });
}
