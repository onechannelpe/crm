import { composeIntegrations } from "~/server/integrations/ui/composition";
import { createRecordImportsRealtime } from "~/server/records/imports/realtime";

export function composeRecordsImportRealtime() {
  return createRecordImportsRealtime(composeIntegrations().integration.jobs);
}
