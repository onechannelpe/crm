import { createAsync } from "@solidjs/router";

import Info from "~/components/icons/info";
import List from "~/components/icons/list";
import { mergeLeadRows } from "~/features/pipeline/data/merge-lead-rows";
import { useOptimisticLeadRows } from "~/features/pipeline/data/optimistic-leads";
import {
  LEAD_LIST_FILTERS_BY_ID,
  leadListQuery,
} from "~/features/pipeline/data/queries";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

import { REVIEW_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenReviewRecord } from "./open-row";

import styles from "./styles.module.css";

export function ReviewRecordIndex() {
  const leads = createAsync(() =>
    leadListQuery(LEAD_LIST_FILTERS_BY_ID.review),
  );
  const optimisticRows = useOptimisticLeadRows("review");
  const { rowOpen } = useOpenReviewRecord();
  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();
    const serverRows = data?.rows ?? [];
    const rows = mergeLeadRows(serverRows, optimisticRows());

    if (data === undefined && rows.length === 0) {
      return { status: "pending", rows: [] };
    }

    return {
      status: "ready",
      rows,
      totalCount: data?.totalCount ?? rows.length,
    };
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
      title: "No hay leads pendientes",
      description: "La cola de revisión está vacía.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<LeadListRowView>;

  return <RecordIndexScreen adapter={adapter} />;
}
