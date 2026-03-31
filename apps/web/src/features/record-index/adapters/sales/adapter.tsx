import { createAsync } from "@solidjs/router";

import { listLeadSales } from "~/actions/pipeline/sales";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";

import type { SalesRow } from "./columns";
import { SALES_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenSalesRecord } from "./open-row";

import styles from "./styles.module.css";

export function SalesRecordIndex() {
  const sales = createAsync(() => listLeadSales({}));
  const rows = () => sales() ?? [];
  const isLoading = () => sales() === undefined;
  const { rowOpen } = useOpenSalesRecord();

  const adapter = {
    id: "sales",
    title: "Ventas",
    ariaLabel: "Ventas",
    pickerIcon: List,
    columns: SALES_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
    rowOpen,
    emptyState: {
      icon: Building2,
      title: "Add your first sale",
      description: "Add your first sale manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<SalesRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
