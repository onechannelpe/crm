import { createAsync } from "@solidjs/router";

import { listLeadsForQuotation } from "~/actions/pipeline/quotations";
import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";
import { RecordIndexPage } from "~/features/record-index/components/page";
import { RecordIndexGrid } from "~/features/record-index/components/table";
import { useRecordIndexAdapter } from "~/features/record-index/hooks/use-adapter";

import { QUOTATIONS_RECORD_INDEX_COLUMNS } from "./columns";
import { QuotationsRecordIndexEmptyState } from "./empty-state";
import { useOpenQuotationRecord } from "./open-row";

import styles from "./styles.module.css";

export function QuotationsRecordIndex() {
  const leads = createAsync(() => listLeadsForQuotation({}), {
    initialValue: [],
  });
  const selection = createDataGridSelection(leads);
  const { rowOpen } = useOpenQuotationRecord();

  const adapter = useRecordIndexAdapter({
    id: "quotations",
    title: "Cotizaciones",
    columns: [...QUOTATIONS_RECORD_INDEX_COLUMNS],
    getRows: leads,
    rowOpen,
    emptyState: <QuotationsRecordIndexEmptyState />,
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
        ariaLabel="Cotizaciones"
        columns={adapter.columns}
        emptyState={adapter.emptyState}
        rowOpen={adapter.rowOpen}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
