import { createRecordImportsRealtime } from "~/server/records/imports/realtime";

import { getIntegrationsRuntime } from "./integrations-runtime";
import { memo } from "./memo";

export const getRecordsImportRealtimeRuntime = memo(() =>
  createRecordImportsRealtime(getIntegrationsRuntime().integration.jobs),
);
