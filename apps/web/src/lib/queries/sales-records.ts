import { query } from "@solidjs/router";

import {
  getSalesRecordEditContext,
  listConfirmedSalesRecords,
  listPendingSalesRecords,
  listSalesRecordProducts,
} from "~/actions/sales-records/read";

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

export const salesRecordEditContextQuery = query(
  getSalesRecordEditContext,
  "salesRecordEditContext",
);
