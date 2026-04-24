import { createAsync } from "@solidjs/router";
import { createEffect, createMemo, createSignal, on } from "solid-js";

import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";
import { mergeLeadRows } from "~/features/workflow/data/merge-lead-rows";
import { getOptimisticLeadRows } from "~/features/workflow/data/optimistic-leads";
import { leadListQuery } from "~/features/workflow/data/queries";
import { hasPermission } from "~/lib/auth/access/rbac";
import { requestAndDownload } from "~/lib/files/client";
import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

import { workspaceColumnsForRole } from "./columns";
import { useCreateLeadRecordAction } from "./create-action";
import {
  LEAD_WORKSPACE_FILTER,
  resolveLeadWorkspaceFilterQuery,
  type LeadWorkspaceFilterValue,
} from "./filter";
import { ImportDropzone } from "./import-dropzone";
import { useOpenLeadRecord } from "./open-row";
import {
  LEAD_WORKSPACE_SORT,
  resolveLeadWorkspaceSortQuery,
  type LeadSortKey,
} from "./sort";
import { useRecordsImport } from "./use-records-import";
import { defaultViewIdForRole, viewsForRole } from "./views";

import styles from "./styles.module.css";

const LEAD_PAGE_SIZE = 100;

export function LeadsWorkspace() {
  const { currentUser } = useAuthenticatedSession();
  const user = currentUser();

  const available = viewsForRole(user.role);
  const [activeId, setActiveId] = createSignal(defaultViewIdForRole(user.role));

  const activeView = createMemo(
    () => available.find((v) => v.id === activeId()) ?? available[0],
  );
  const [pageIndex, setPageIndex] = createSignal(0);
  const [selectedFilter, setSelectedFilter] = createSignal<string | undefined>(
    LEAD_WORKSPACE_FILTER.defaultValue,
  );
  const [selectedSort, setSelectedSort] = createSignal<string | undefined>(
    LEAD_WORKSPACE_SORT.defaultValue,
  );

  createEffect(
    on([activeView, selectedFilter, selectedSort], () => {
      setPageIndex(0);
    }),
  );

  const queryFilters = createMemo(() => ({
    ...activeView().filters(user.id),
    ...resolveLeadWorkspaceFilterQuery(selectedFilter()),
    ...resolveLeadWorkspaceSortQuery(selectedSort()),
  }));

  const leads = createAsync(() =>
    leadListQuery({
      ...queryFilters(),
      limit: LEAD_PAGE_SIZE,
      offset: pageIndex() * LEAD_PAGE_SIZE,
    }),
  );

  const totalCount = createMemo(() => leads()?.totalCount ?? 0);
  const hasPreviousPage = createMemo(() => pageIndex() > 0);
  const hasNextPage = createMemo(
    () => (pageIndex() + 1) * LEAD_PAGE_SIZE < totalCount(),
  );

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
  const recordImport = useRecordsImport();
  const canManageIntegrations = hasPermission(user.role, "integration:manage");

  async function handleExport() {
    await requestAndDownload("records_export", {});
  }

  const adapter = {
    id: "leads-workspace",
    title: () => activeView().label,
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: workspaceColumnsForRole(user.role),
    source,
    serverManagedFiltering: true,
    serverManagedSorting: true,
    onFilterValueChange: setSelectedFilter,
    onSortValueChange: setSelectedSort,
    pagination: {
      currentPage: pageIndex,
      pageSize: LEAD_PAGE_SIZE,
      totalCount,
      onNextPage: () =>
        setPageIndex((current) => (hasNextPage() ? current + 1 : current)),
      onPreviousPage: () =>
        setPageIndex((current) => (hasPreviousPage() ? current - 1 : current)),
    },
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
    actions: canManageIntegrations
      ? [
          {
            key: "import-csv",
            label: "Importar",
            onClick: () => recordImport.openFilePicker(),
          },
          {
            key: "export",
            label: "Exportar",
            onClick: handleExport,
          },
        ]
      : undefined,
    filter: LEAD_WORKSPACE_FILTER,
    sort: LEAD_WORKSPACE_SORT,
  } satisfies RecordIndexAdapter<
    LeadListRowView,
    LeadWorkspaceFilterValue,
    LeadSortKey
  >;

  return (
    <ImportDropzone
      enabled={canManageIntegrations}
      onFileDropped={recordImport.importFile}
    >
      <input
        ref={recordImport.bindFileInput}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={recordImport.onFileInputChange}
      />
      <RecordIndexScreen adapter={adapter} />
    </ImportDropzone>
  );
}
