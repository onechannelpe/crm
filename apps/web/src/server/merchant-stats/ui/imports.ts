import "server-only";
import type { GpvSnapshotView } from "~/contracts/merchant-stats/imports";
import { GpvSnapshotId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function getGpvSnapshot(
  rawSnapshotId: string,
): Promise<GpvSnapshotView> {
  return executeSessionServerFunction({
    name: "merchantStats.import.read",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () =>
      parseObject({ snapshotId: rawSnapshotId }, validationFail, (r) => ({
        snapshotId: r.id("snapshotId", GpvSnapshotId),
      })),
    telemetry: ({ snapshotId }) => ({ snapshotId }),
    execute: async (_ctx, { snapshotId }) =>
      application.merchantStats.imports.snapshot(snapshotId),
  });
}
