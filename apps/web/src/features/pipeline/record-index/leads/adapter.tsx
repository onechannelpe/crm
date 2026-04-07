import { createAsync } from "@solidjs/router";

import { queryLeadList } from "~/actions/pipeline/queries/leads";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list-view";

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
  const leads = createAsync(() => queryLeadList({}));
  const { rowOpen } = useOpenLeadRecord();
  const createAction = useCreateLeadRecordAction();
  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();

    if (data === undefined) {
      return {
        status: "pending",
        rows: [],
      };
    }

    return {
      status: "ready",
      rows: data.rows,
    };
  };

  const adapter = {
    id: "leads",
    title: "All prospects",
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: LEADS_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Building2,
      title: "Add your first prospect",
      description: "Add your first prospect manually.",
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
