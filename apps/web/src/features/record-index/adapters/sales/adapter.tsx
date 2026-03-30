import { createAsync } from "@solidjs/router";

import { listLeadSales } from "~/actions/pipeline/sales";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";

import type { SalesRow } from "./columns";
import { SALES_RECORD_INDEX_COLUMNS } from "./columns";
import { SalesRecordIndexEmptyState } from "./empty-state";
import { useOpenSalesRecord } from "./open-row";

import styles from "./styles.module.css";

export function SalesRecordIndex() {
  const sales = createAsync(() => listLeadSales({}), { initialValue: [] });
  const { rowOpen } = useOpenSalesRecord();

  const adapter = {
    id: "sales",
    title: "Ventas",
    ariaLabel: "Ventas",
    pickerIcon: List,
    columns: SALES_RECORD_INDEX_COLUMNS,
    getRows: sales,
    rowOpen,
    emptyState: <SalesRecordIndexEmptyState />,
    class: styles.page,
  } satisfies RecordIndexAdapter<SalesRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
