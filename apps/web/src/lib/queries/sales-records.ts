import { query } from "@solidjs/router";

import {
  getSalesRecordFixContext,
  listConfirmedSalesRecords,
  listPendingSalesRecords,
  listSalesRecordProducts,
} from "~/actions/sales-records";

export const pendingSalesRecordsQuery = query(
  listPendingSalesRecords,
  "pendingSalesRecords",
);

export const confirmedSalesRecordsQuery = query(
  listConfirmedSalesRecords,
  "confirmedSalesRecords",
);

export const salesRecordProductsQuery = query(
  listSalesRecordProducts,
  "salesRecordProducts",
);

export const salesRecordFixContextQuery = query(
  getSalesRecordFixContext,
  "salesRecordFixContext",
);
