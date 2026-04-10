import { action, json } from "@solidjs/router";

import { queueLeadExport } from "~/actions/integrations/exports";
import { integrationJobsQuery } from "~/lib/queries/integrations";

export const queueLeadExportMutation = action(async () => {
  await queueLeadExport();
  return json({}, { revalidate: integrationJobsQuery.key });
}, "queueLeadExport");
