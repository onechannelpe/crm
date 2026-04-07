import { createAsync } from "@solidjs/router";

import { queryLeadList } from "~/actions/pipeline/queries/leads";
import Info from "~/components/icons/info";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list-view";

import { REVIEW_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenReviewRecord } from "./open-row";

import styles from "./styles.module.css";

export function ReviewRecordIndex() {
  const leads = createAsync(() =>
    queryLeadList({ stage: "PENDING_EXTERNAL_REVIEW" }),
  );
  const { rowOpen } = useOpenReviewRecord();
  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();

    if (data === undefined) {
      return { status: "pending", rows: [] };
    }

    return { status: "ready", rows: data.rows };
  };

  const adapter = {
    id: "review",
    title: "Cola de revisión",
    ariaLabel: "Revisión",
    pickerIcon: List,
    columns: REVIEW_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Info,
      title: "Add your first review lead",
      description: "Add your first review lead manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<LeadListRowView>;

  return <RecordIndexScreen adapter={adapter} />;
}
