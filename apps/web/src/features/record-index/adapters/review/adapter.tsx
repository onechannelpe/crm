import { createAsync } from "@solidjs/router";

import { listLeadsForReview } from "~/actions/pipeline/review";
import Info from "~/components/icons/info";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";

import type { ReviewRow } from "./columns";
import { REVIEW_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenReviewRecord } from "./open-row";

import styles from "./styles.module.css";

export function ReviewRecordIndex() {
  const leads = createAsync(() =>
    listLeadsForReview({ stage: "PENDING_EXTERNAL_REVIEW" }),
  );
  const rows = () => leads() ?? [];
  const isLoading = () => leads() === undefined;
  const { rowOpen } = useOpenReviewRecord();

  const adapter = {
    id: "review",
    title: "Cola de revisión",
    ariaLabel: "Revisión",
    pickerIcon: List,
    columns: REVIEW_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Info,
      title: "Add your first review lead",
      description: "Add your first review lead manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<ReviewRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
