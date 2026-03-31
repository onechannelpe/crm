import { createAsync } from "@solidjs/router";

import { listLeads } from "~/actions/pipeline/leads";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";

import type { LeadRow } from "./columns";
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
  const leads = createAsync(() => listLeads({}));
  const rows = () => leads() ?? [];
  const isLoading = () => leads() === undefined;
  const { rowOpen } = useOpenLeadRecord();
  const createAction = useCreateLeadRecordAction();

  const adapter = {
    id: "leads",
    title: "All prospects",
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gater-for-drag-select`,
    pickerIcon: List,
    columns: LEADS_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
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
  } satisfies RecordIndexAdapter<LeadRow, LeadStageFilterValue, LeadSortKey>;

  return <RecordIndexScreen adapter={adapter} />;
}
