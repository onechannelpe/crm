import { createAsync } from "@solidjs/router";

import { listLeadSales } from "~/actions/pipeline/sales";
import List from "~/components/icons/list";
import { createDataGridSelection, DataGridToolbar } from "~/features/data-grid";
import {
  RecordIndexGrid,
  RecordIndexPage,
  useRecordIndexAdapter,
} from "~/features/record-index";

import { SALES_RECORD_INDEX_COLUMNS } from "./columns";
import { SalesRecordIndexEmptyState } from "./empty-state";
import { useOpenSalesRecord } from "./open-row";

import styles from "./styles.module.css";

export function SalesRecordIndex() {
  const sales = createAsync(() => listLeadSales({}), { initialValue: [] });
  const selection = createDataGridSelection(sales);
  const { rowOpen } = useOpenSalesRecord();

  const adapter = useRecordIndexAdapter({
    id: "sales",
    title: "Ventas",
    columns: [...SALES_RECORD_INDEX_COLUMNS],
    getRows: sales,
    rowOpen,
    emptyState: <SalesRecordIndexEmptyState />,
  });

  return (
    <RecordIndexPage class={styles.page}>
      <DataGridToolbar
        picker={{
          icon: List,
          label: adapter.title,
          count: adapter.getRows().length,
        }}
        rightContent={<></>}
      />

      <RecordIndexGrid
        ariaLabel="Ventas"
        columns={adapter.columns}
        emptyState={adapter.emptyState}
        rowOpen={adapter.rowOpen}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
