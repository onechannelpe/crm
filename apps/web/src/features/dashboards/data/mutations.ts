import { action } from "@solidjs/router";

import {
  adjustMonthCredit,
  setMerchantTarget,
} from "~/actions/merchant-gpv/attribution";
import { requestMerchantGpvExportDownloadToken } from "~/actions/merchant-gpv/dashboard";
import {
  resolveGpvImportIssue,
  uploadMerchantReport,
} from "~/actions/merchant-gpv/imports";

export const adjustMonthCreditMutation = action(
  adjustMonthCredit,
  "adjustMerchantMonthCredit",
);

export const setMerchantTargetMutation = action(
  setMerchantTarget,
  "setMerchantGpvTarget",
);

export const uploadMerchantReportMutation = action(
  uploadMerchantReport,
  "uploadMerchantGpvReport",
);

export const resolveGpvImportIssueMutation = action(
  resolveGpvImportIssue,
  "resolveMerchantGpvImportIssue",
);

export const requestMerchantGpvExportMutation = action(
  requestMerchantGpvExportDownloadToken,
  "requestMerchantGpvExport",
);
