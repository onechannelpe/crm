import { createAsync } from "@solidjs/router";

import { listLeadsForReview } from "~/actions/pipeline/review";
import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";
import { RecordIndexPage } from "~/features/record-index/components/page";
import { RecordIndexGrid } from "~/features/record-index/components/table";
import { useRecordIndexAdapter } from "~/features/record-index/hooks/use-adapter";

import { REVIEW_RECORD_INDEX_COLUMNS } from "./columns";
import { ReviewRecordIndexEmptyState } from "./empty-state";
import { useOpenReviewRecord } from "./open-row";

import styles from "./styles.module.css";

export function ReviewRecordIndex() {
  const leads = createAsync(
    () => listLeadsForReview({ stage: "PENDING_EXTERNAL_REVIEW" }),
    { initialValue: [] },
  );
  const selection = createDataGridSelection(leads);
  const { rowOpen } = useOpenReviewRecord();

  const adapter = useRecordIndexAdapter({
    id: "review",
    title: "Cola de revisión",
    columns: [...REVIEW_RECORD_INDEX_COLUMNS],
    getRows: leads,
    rowOpen,
    emptyState: <ReviewRecordIndexEmptyState />,
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
        ariaLabel="Revisión"
        columns={adapter.columns}
        emptyState={adapter.emptyState}
        rowOpen={adapter.rowOpen}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
