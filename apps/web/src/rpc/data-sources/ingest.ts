import { query } from "@solidjs/router";

import type { IngestJob, IngestSource } from "~/contracts/data-sources/ingest";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function listDataSourceKeys(): Promise<IngestSource[]> {
  "use server";

  return executeSessionServerFunction({
    name: "data_sources.ingest.list_sources",
    access: { kind: "permission", permission: "data-source:import" },

    execute: () => getApplication().dataSourceUploads.listSources(),
  });
}

export const listDataSourceKeysQuery = query(
  () => listDataSourceKeys(),
  "data_sources.ingest.list_sources",
);

export async function registerDataSourceUpload(
  sourceKey: unknown,
  snapshotLabel: unknown,
  snapshotDate: unknown,
  sizeBytes: unknown,
  sha256: unknown,
): Promise<{ uploadId: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "data_sources.ingest.register_upload",
    access: { kind: "permission", permission: "data-source:import" },

    parse: () =>
      parseObject(
        { sourceKey, snapshotLabel, snapshotDate, sizeBytes, sha256 },
        validationFail,
        (r) => ({
          sourceKey: r.str("sourceKey"),
          snapshotLabel: r.str("snapshotLabel"),
          snapshotDate: r.calendarDate("snapshotDate"),
          sizeBytes: r.posInt("sizeBytes"),
          sha256: r.str("sha256"),
        }),
      ),

    telemetry: (input) => ({ sourceKey: input.sourceKey }),

    execute: (ctx, input) =>
      getApplication().dataSourceUploads.register({
        sourceKey: input.sourceKey,
        snapshotLabel: input.snapshotLabel,
        snapshotDate: input.snapshotDate,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
      }),
  });
}

export async function getDataSourceUploadJob(
  jobId: unknown,
): Promise<IngestJob> {
  "use server";

  return executeSessionServerFunction({
    name: "data_sources.ingest.get_job",
    access: { kind: "permission", permission: "data-source:import" },

    parse: () =>
      parseObject({ jobId }, validationFail, (r) => ({
        jobId: r.str("jobId"),
      })),

    telemetry: (input) => ({ jobId: input.jobId }),

    execute: (ctx, input) =>
      getApplication().dataSourceUploads.getJob(input.jobId),
  });
}
