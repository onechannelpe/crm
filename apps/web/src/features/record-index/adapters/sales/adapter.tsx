import { createAsync } from "@solidjs/router";

import { listLeadSales } from "~/actions/pipeline/sales";
import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";
import { RecordIndexPage } from "~/features/record-index/components/page";
import { RecordIndexGrid } from "~/features/record-index/components/table";
import { useRecordIndexAdapter } from "~/features/record-index/hooks/use-adapter";

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
