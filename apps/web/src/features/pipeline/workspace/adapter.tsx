import { createAsync } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { mergeLeadRows } from "~/features/pipeline/data/merge-lead-rows";
import { getOptimisticLeadRows } from "~/features/pipeline/data/optimistic-leads";
import { leadListQuery } from "~/features/pipeline/data/queries";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";
import { hasPermission } from "~/lib/auth/access/rbac";
import { requestAndDownload } from "~/lib/files/client";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

import { workspaceColumnsForRole } from "./columns";
import { useCreateLeadRecordAction } from "./create-action";
import { LEAD_WORKSPACE_FILTER, type LeadStageFilterValue } from "./filter";
import { useOpenLeadRecord } from "./open-row";
import { LEAD_WORKSPACE_SORT, type LeadSortKey } from "./sort";
import { defaultViewIdForRole, viewsForRole } from "./views";

import styles from "./styles.module.css";

export function LeadsWorkspace() {
  const { currentUser } = useAuthenticatedSession();
  const user = currentUser();

  const available = viewsForRole(user.role);
  const [activeId, setActiveId] = createSignal(defaultViewIdForRole(user.role));

  const activeView = createMemo(
    () => available.find((v) => v.id === activeId()) ?? available[0],
  );

  const leads = createAsync(() => leadListQuery(activeView().filters(user.id)));

  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();
    const serverRows = data?.rows ?? [];
    const rows = mergeLeadRows(
      serverRows,
      getOptimisticLeadRows(activeView().id),
    );

    if (data === undefined && rows.length === 0) {
      return { status: "pending", rows: [] };
    }

    return {
      status: "ready",
      rows,
      totalCount: data?.totalCount ?? rows.length,
    };
  };

  const { rowOpen } = useOpenLeadRecord();
  const createAction = useCreateLeadRecordAction();

  async function handleExport() {
    await requestAndDownload("leads_export", {});
  }

  const adapter = {
    id: "leads-workspace",
    title: () => activeView().label,
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: workspaceColumnsForRole(user.role),
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Building2,
      title: "No hay prospectos",
      description: "No existen resultados para esta vista.",
    },
    createAction: hasPermission(user.role, "lead:register")
      ? createAction
      : undefined,
    views: {
      available,
      active: activeView,
      onSelect: setActiveId,
    },
    exportAction: hasPermission(user.role, "integration:manage")
      ? handleExport
      : undefined,
    filter: LEAD_WORKSPACE_FILTER,
    sort: LEAD_WORKSPACE_SORT,
  } satisfies RecordIndexAdapter<
    LeadListRowView,
    LeadStageFilterValue,
    LeadSortKey
  >;

  return <RecordIndexScreen adapter={adapter} />;
}
