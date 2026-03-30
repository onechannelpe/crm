import { createAsync } from "@solidjs/router";

import { listLeadSales } from "~/actions/pipeline/sales";
import List from "~/components/icons/list";
import { createDataGridSelection, DataGridToolbar } from "~/features/data-grid";
import {
  RecordIndexGrid,
  RecordIndexPage,
  useRecordIndexAdapter,
} from "~/features/record-index";

import { SALES_CRM_RECORD_INDEX_COLUMNS } from "./columns";
import { SalesCrmRecordIndexEmptyState } from "./empty-state";
import { useOpenSalesCrmRecord } from "./open-row";

import styles from "./styles.module.css";

export function SalesCrmRecordIndex() {
  const sales = createAsync(() => listLeadSales({}), { initialValue: [] });
  const selection = createDataGridSelection(sales);
  const { rowOpen } = useOpenSalesCrmRecord();

  const adapter = useRecordIndexAdapter({
    id: "sales-crm",
    title: "Ventas CRM",
    columns: [...SALES_CRM_RECORD_INDEX_COLUMNS],
    getRows: sales,
    rowOpen,
    emptyState: <SalesCrmRecordIndexEmptyState />,
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
        ariaLabel="Ventas CRM"
        columns={adapter.columns}
        emptyState={adapter.emptyState}
        rowOpen={adapter.rowOpen}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
