import { createSalesRecordMutationsContext } from "~/server/sales-records/infrastructure/mutations-context";
import { createSalesRecordReadContext } from "~/server/sales-records/infrastructure/read-context";

import type { ServerInfra } from "./infra";

export function createSalesRecordsRuntime(infra: ServerInfra) {
  return {
    mutations: createSalesRecordMutationsContext(infra.db),
    read: createSalesRecordReadContext(infra.db),
  };
}
