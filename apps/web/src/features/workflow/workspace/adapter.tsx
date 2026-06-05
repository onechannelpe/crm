import { createAsync } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

import { requestWorkflowLeadsExportDownloadToken } from "~/actions/workflow/files";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import type { LeadListRowView, LeadListView } from "~/contracts/workflow/views";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/adapter";
import { mergeLeadRows } from "~/features/workflow/data/merge-lead-rows";
import { getOptimisticLeadRows } from "~/features/workflow/data/optimistic-leads";
import { leadListQuery } from "~/features/workflow/data/queries";
import { hasPermission } from "~/lib/auth/access/rbac";
import { downloadWithToken } from "~/lib/files/client";

import { workspaceColumnsForRole } from "./columns";
import { useCreateLeadRecordAction } from "./create-action";
import {
  LEAD_WORKSPACE_FILTER,
  resolveLeadWorkspaceFilterQuery,
} from "./filter";
import { ImportDropzone } from "./import-dropzone";
import { useOpenLeadRecord } from "./open-row";
import { LEAD_WORKSPACE_SORT, resolveLeadWorkspaceSortQuery } from "./sort";
import { useRecordsImport } from "./use-records-import";
import { defaultViewIdForRole, viewsForRole } from "./views";

import styles from "./styles.module.css";

const LEAD_PAGE_SIZE = 100;
const LEAD_SEARCH_DEBOUNCE_MS = 250;

export function LeadsWorkspace() {
  const { currentUser } = useAuthenticatedSession();
  const user = currentUser();

  const available = viewsForRole(user.role);
  const defaultViewId = defaultViewIdForRole(user.role);
  const [activeId, setActiveId] = createSignal(defaultViewId);

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
  const [anyFieldSearch, setAnyFieldSearch] = createSignal("");
  const [debouncedAnyFieldSearch, setDebouncedAnyFieldSearch] =
    createSignal("");

  const [lastResolvedLeads, setLastResolvedLeads] =
    createSignal<LeadListView>();

  createEffect(
    on(activeView, () => {
      setAnyFieldSearch("");
      setDebouncedAnyFieldSearch("");
      setLastResolvedLeads(undefined);
      setPageIndex(0);
    }),
  );

  createEffect(
    on(anyFieldSearch, (value) => {
      const normalized = value.trim();
      if (!normalized) {
        setDebouncedAnyFieldSearch("");
        return;
      }

      const timeout = setTimeout(() => {
        setDebouncedAnyFieldSearch(normalized);
      }, LEAD_SEARCH_DEBOUNCE_MS);

      onCleanup(() => clearTimeout(timeout));
    }),
  );

  createEffect(
    on([selectedFilter, selectedSort, debouncedAnyFieldSearch], () => {
      setPageIndex(0);
    }),
  );

  const anyFieldSearchQuery = createMemo(
    () => debouncedAnyFieldSearch() || undefined,
  );
  const queryFilters = createMemo(() => ({
    ...activeView().filters(user.id),
    ...resolveLeadWorkspaceFilterQuery(selectedFilter()),
    ...resolveLeadWorkspaceSortQuery(selectedSort()),
    anyFieldSearch: anyFieldSearchQuery(),
  }));

  const leads = createAsync(() =>
    leadListQuery({
      ...queryFilters(),
      limit: LEAD_PAGE_SIZE,
      offset: pageIndex() * LEAD_PAGE_SIZE,
    }),
  );

  createEffect(() => {
    const data = leads();
    if (data !== undefined) {
      setLastResolvedLeads(() => data);
    }
  });

  const effectiveLeads = createMemo(() => leads() ?? lastResolvedLeads());
  const totalCount = createMemo(() => effectiveLeads()?.totalCount ?? 0);
  const hasPreviousPage = createMemo(() => pageIndex() > 0);
  const hasNextPage = createMemo(
    () => (pageIndex() + 1) * LEAD_PAGE_SIZE < totalCount(),
  );

  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = effectiveLeads();
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
    const { token } = await requestWorkflowLeadsExportDownloadToken();
    downloadWithToken(token);
  }

  const adapter = {
    id: "leads-workspace",
    title: () => activeView().label,
    ariaLabel: "Clientes",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: workspaceColumnsForRole(user.role),
    source,
    search: {
      value: anyFieldSearch,
      placeholder: "RUC, cliente, dirección o ejecutivo",
      set: setAnyFieldSearch,
    },
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
      title: "No hay clientes",
      description: "No existen resultados para esta vista.",
    },
    createAction: hasPermission(user.role, "lead:register")
      ? createAction
      : undefined,
    views: {
      catalog: { available, defaultId: defaultViewId },
      value: { value: activeId, set: setActiveId },
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
    filter: {
      catalog: LEAD_WORKSPACE_FILTER,
      value: {
        value: selectedFilter,
        set: (value) => setSelectedFilter(value),
      },
    },
    sort: {
      catalog: LEAD_WORKSPACE_SORT,
      value: { value: selectedSort, set: (value) => setSelectedSort(value) },
    },
  } satisfies RecordIndexAdapter<LeadListRowView>;

  return (
    <ImportDropzone
      enabled={canManageIntegrations}
      onFileDropped={recordImport.importFile}
    >
      <input
        ref={recordImport.bindFileInput}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: "none" }}
        onChange={recordImport.onFileInputChange}
      />
      <RecordIndexScreen adapter={adapter} />
    </ImportDropzone>
  );
}
