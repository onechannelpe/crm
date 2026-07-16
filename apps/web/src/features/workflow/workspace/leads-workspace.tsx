import { createAsync } from "@solidjs/router";

import { requestWorkflowLeadsExportDownloadToken } from "~/actions/workflow/files";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { MAX_PENDING_QUOTATION_DECISIONS } from "~/contracts/workflow/limits";
import type { LeadListRowView } from "~/contracts/workflow/views";
import type { DataGridSource } from "~/features/data-grid/model/source";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexDefinition } from "~/features/record-index/model/definition";
import { mergeLeadRows } from "~/features/workflow/data/merge-lead-rows";
import { getOptimisticLeadRows } from "~/features/workflow/data/optimistic-leads";
import {
  leadListQuery,
  pendingQuotationCountQuery,
} from "~/features/workflow/data/queries";
import { hasPermission } from "~/lib/auth/access/rbac";
import { downloadWithToken } from "~/lib/files/client";

import { workspaceColumnsForRole } from "./columns";
import { useCreateLeadRecordAction } from "./create-action";
import { LEAD_WORKSPACE_FILTER } from "./filter";
import { ImportDropzone } from "./import-dropzone";
import { LEAD_PAGE_SIZE, resolveLeadListQueryInput } from "./lead-list-query";
import { useOpenLeadRecord } from "./open-row";
import { LEAD_WORKSPACE_SORT } from "./sort";
import { useLeadIndexRoute } from "./use-lead-index-route";
import { useRecordsImport } from "./use-records-import";
import { defaultViewIdForRole, viewsForRole } from "./views";

import styles from "./styles.module.css";

async function handleLeadsExport() {
  const { token } = await requestWorkflowLeadsExportDownloadToken();
  downloadWithToken(token);
}

export function LeadsWorkspace() {
  const { currentUser } = useAuthenticatedSession();
  const user = currentUser();

  const available = viewsForRole(user.role);
  const defaultViewId = defaultViewIdForRole(user.role);
  const route = useLeadIndexRoute({
    availableViews: available,
    defaultViewId,
  });
  const leads = createAsync(() =>
    leadListQuery(
      resolveLeadListQueryInput(
        {
          view: route.view.value(),
          filter: route.filter.value(),
          sort: route.sort.value(),
          search: route.search.query(),
          pageIndex: route.page.index(),
        },
        { id: user.id, role: user.role },
      ),
    ),
  );

  const totalCount = () => leads.latest?.totalCount ?? 0;
  const hasPreviousPage = () => route.page.index() > 0;
  const hasNextPage = () =>
    (route.page.index() + 1) * LEAD_PAGE_SIZE < totalCount();

  const source = (): DataGridSource<LeadListRowView> => {
    const data = leads.latest;
    const serverRows = data?.rows ?? [];
    const rows = mergeLeadRows(
      serverRows,
      getOptimisticLeadRows(route.activeView().id),
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

  const openLeadRecord = useOpenLeadRecord();
  const { enqueueWarningSnackBar } = useSnackBar();

  const canRegister = hasPermission(user.role, "lead:register");
  const pendingQuotations = createAsync(
    () =>
      canRegister
        ? pendingQuotationCountQuery()
        : Promise.resolve({ count: 0, limit: MAX_PENDING_QUOTATION_DECISIONS }),
    { initialValue: { count: 0, limit: MAX_PENDING_QUOTATION_DECISIONS } },
  );
  const isRegistrationBlocked = () =>
    pendingQuotations().count >= pendingQuotations().limit;

  const createAction = useCreateLeadRecordAction({
    isBlocked: isRegistrationBlocked,
    onBlocked: () =>
      enqueueWarningSnackBar(
        `Tienes ${pendingQuotations().count} cotizaciones pendientes de decisión. Acéptalas, solicita revisión o ciérralas para registrar nuevos clientes.`,
      ),
  });
  const recordImport = useRecordsImport();
  const canManageIntegrations = hasPermission(user.role, "integration:manage");

  const recordIndex = {
    id: "leads-workspace",
    title: () => route.activeView().label,
    ariaLabel: "Clientes",
    class: styles.page,
    pickerIcon: List,
    object: {
      label: "Registros",
      icon: Building2,
      color: "blue",
    },
    columns: workspaceColumnsForRole(user.role),
    source,
    search: {
      value: route.search.value,
      placeholder: "RUC, cliente, dirección o ejecutivo",
      set: route.search.set,
    },
    pagination: {
      currentPage: route.page.index,
      pageSize: LEAD_PAGE_SIZE,
      totalCount,
      onNextPage: () => {
        if (hasNextPage()) {
          route.page.next();
        }
      },
      onPreviousPage: () => {
        if (hasPreviousPage()) {
          route.page.previous();
        }
      },
    },
    onRowOpen: openLeadRecord,
    rowOpenIndicator: "panel",
    emptyState: {
      icon: Building2,
      title: "No hay clientes",
      description: "No hay clientes que coincidan con los filtros actuales.",
    },
    createAction: canRegister ? createAction : undefined,
    views: {
      catalog: { available },
      control: route.view,
    },
    actions: canManageIntegrations
      ? [
          {
            label: "Importar",
            onClick: () => recordImport.openFilePicker(),
          },
          {
            label: "Exportar",
            onClick: handleLeadsExport,
          },
        ]
      : undefined,
    filter: {
      catalog: LEAD_WORKSPACE_FILTER,
      control: route.filter,
    },
    sort: {
      catalog: LEAD_WORKSPACE_SORT,
      control: route.sort,
    },
  } satisfies RecordIndexDefinition<LeadListRowView>;

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
      <RecordIndexScreen definition={recordIndex} />
    </ImportDropzone>
  );
}
