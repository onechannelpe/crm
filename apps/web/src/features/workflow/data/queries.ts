import { query } from "@solidjs/router";

import { listLeadSaleProofFiles } from "~/actions/workflow/files";
import { queryMyInquiries } from "~/actions/workflow/queries/inquiries";
import {
  queryAssignableExecutives,
  queryFulfillmentQueue,
  queryLeadBootstrapPreview,
  queryLeadDetail,
  queryLeadList,
  queryPendingQuotationCount,
} from "~/actions/workflow/queries/records";

export const leadListQuery = query(queryLeadList, "workflow.leadList");

export const leadDetailQuery = query(queryLeadDetail, "workflow.leadDetail");

export const leadBootstrapPreviewQuery = query(
  queryLeadBootstrapPreview,
  "workflow.leadBootstrapPreview",
);

export const assignableExecutivesQuery = query(
  queryAssignableExecutives,
  "workflow.assignableExecutives",
);

export const fulfillmentQueueQuery = query(
  queryFulfillmentQueue,
  "workflow.fulfillmentQueue",
);

export const pendingQuotationCountQuery = query(
  queryPendingQuotationCount,
  "workflow.pendingQuotationCount",
);

export const inquiryListQuery = query(queryMyInquiries, "workflow.inquiryList");

export const leadSaleProofFilesQuery = query(
  listLeadSaleProofFiles,
  "workflow.leadSaleProofFiles",
);
