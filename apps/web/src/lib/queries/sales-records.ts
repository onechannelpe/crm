import { query } from "@solidjs/router";

import {
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
