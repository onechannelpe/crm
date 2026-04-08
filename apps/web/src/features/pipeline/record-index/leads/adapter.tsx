import { createAsync } from "@solidjs/router";

import Building2 from "~/components/icons/building-2";
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

import { LEADS_RECORD_INDEX_COLUMNS } from "./columns";
import { useCreateLeadRecordAction } from "./create-action";
import {
  LEADS_RECORD_INDEX_FILTER,
  type LeadStageFilterValue,
} from "./filters";
import { useOpenLeadRecord } from "./open-row";
import { LEADS_RECORD_INDEX_SORT, type LeadSortKey } from "./sorts";

import styles from "./styles.module.css";

export function LeadsRecordIndex() {
  const leads = createAsync(() => leadListQuery(LEAD_LIST_FILTERS_BY_ID.all));
  const optimisticRows = useOptimisticLeadRows("all");
  const { rowOpen } = useOpenLeadRecord();
  const createAction = useCreateLeadRecordAction();
  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();
    const serverRows = data?.rows ?? [];
    const rows = mergeLeadRows(serverRows, optimisticRows());

    if (data === undefined && rows.length === 0) {
      return {
        status: "pending",
        rows: [],
      };
    }

    return {
      status: "ready",
      rows,
      totalCount: data?.totalCount ?? rows.length,
    };
  };

  const adapter = {
    id: "leads",
    title: "Todos los prospectos",
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: LEADS_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Building2,
      title: "Agrega tu primer prospecto",
      description: "Crea un prospecto para comenzar a trabajar esta lista.",
    },
    createAction,
    filter: LEADS_RECORD_INDEX_FILTER,
    sort: LEADS_RECORD_INDEX_SORT,
  } satisfies RecordIndexAdapter<
    LeadListRowView,
    LeadStageFilterValue,
    LeadSortKey
  >;

  return <RecordIndexScreen adapter={adapter} />;
}
