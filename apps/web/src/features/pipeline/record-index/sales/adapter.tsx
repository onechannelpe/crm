import { createAsync } from "@solidjs/router";

import { querySales } from "~/actions/pipeline/queries/sales";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";

import type { SalesRow } from "./columns";
import { SALES_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenSalesRecord } from "./open-row";

import styles from "./styles.module.css";

export function SalesRecordIndex() {
  const sales = createAsync(() => querySales({}));
  const { rowOpen } = useOpenSalesRecord();
  const source = (): RecordIndexSource<SalesRow> => {
    const data = sales();

    if (data === undefined) {
      return { status: "pending", rows: [] };
    }

    return { status: "ready", rows: data };
  };

  const adapter = {
    id: "sales",
    title: "Ventas",
    ariaLabel: "Ventas",
    pickerIcon: List,
    columns: SALES_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
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
