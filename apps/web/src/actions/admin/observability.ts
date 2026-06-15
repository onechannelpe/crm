"use server";

import type {
  ObservabilitySnapshot,
  ObservabilitySnapshotInput,
} from "~/server/observability/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export type {
  ObservabilityActionEvent,
  ObservabilityActionSummary,
  ObservabilitySnapshot,
  ObservabilitySnapshotInput,
} from "~/server/observability/contracts";

export async function getObservabilitySnapshot(
  params?: ObservabilitySnapshotInput,
): Promise<ObservabilitySnapshot> {
  return runAction({
    name: "admin.observability.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: () =>
      getServerRuntime().observability.observabilityService.getActionSnapshot(
        params,
      ),
  });
}
