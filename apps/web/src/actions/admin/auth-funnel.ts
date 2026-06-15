"use server";

import type {
  AuthFunnelSnapshot,
  AuthFunnelSnapshotInput,
} from "~/server/observability/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export type {
  AuthFunnelRecentEvent,
  AuthFunnelSnapshot,
  AuthFunnelSnapshotInput,
  AuthFunnelSummaryRow,
} from "~/server/observability/contracts";

export async function getAuthFunnelSnapshot(
  params?: AuthFunnelSnapshotInput,
): Promise<AuthFunnelSnapshot> {
  return runAction({
    name: "admin.auth_funnel.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: () =>
      getServerRuntime().observability.observabilityService.getAuthFunnelSnapshot(
        params,
      ),
  });
}
