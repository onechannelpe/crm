import { action, json } from "@solidjs/router";

import {
  adjustMonthCredit,
  setMerchantTarget,
} from "~/actions/merchant-stats/attribution.action";
import { requestMerchantGpvExportDownloadToken } from "~/actions/merchant-stats/dashboard.action";
import {
  resolveGpvImportIssue,
  uploadMerchantReport,
} from "~/actions/merchant-stats/imports.action";

import { gpvSnapshotQuery, merchantFilterOptionsQuery } from "./queries";
import {
  ATTRIBUTION_GPV_QUERY_KEYS,
  PUBLISHED_GPV_QUERY_KEYS,
} from "./revalidation";

export const adjustMonthCreditMutation = action(
  async (input: Parameters<typeof adjustMonthCredit>[0]) => {
    const result = await adjustMonthCredit(input);

    return json(result, {
      revalidate: [
        ...ATTRIBUTION_GPV_QUERY_KEYS,
        merchantFilterOptionsQuery.key,
      ],
    });
  },
  "adjustMerchantMonthCredit",
);

export const setMerchantTargetMutation = action(
  async (input: Parameters<typeof setMerchantTarget>[0]) => {
    const result = await setMerchantTarget(input);

    return json(result, { revalidate: ATTRIBUTION_GPV_QUERY_KEYS });
  },
  "setMerchantGpvTarget",
);

export const uploadMerchantReportMutation = action(
  uploadMerchantReport,
  "uploadMerchantGpvReport",
);

export const resolveGpvImportIssueMutation = action(
  async (input: Parameters<typeof resolveGpvImportIssue>[0]) => {
    const result = await resolveGpvImportIssue(input);
    const revalidate = [gpvSnapshotQuery.key];

    if (result.activated) {
      revalidate.push(...PUBLISHED_GPV_QUERY_KEYS);
    }

    return json(result, { revalidate });
  },
  "resolveMerchantGpvImportIssue",
);

export const requestMerchantGpvExportMutation = action(
  requestMerchantGpvExportDownloadToken,
  "requestMerchantGpvExport",
);
