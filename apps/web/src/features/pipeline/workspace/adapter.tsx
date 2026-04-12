import { createAsync, useAction, useSearchParams } from "@solidjs/router";
import { createSignal } from "solid-js";

import List from "~/components/icons/list";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { leadListQuery } from "~/features/pipeline/data/queries";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
  RecordIndexToolbarAction,
} from "~/features/record-index/model/types";
import { toAppError } from "~/lib/app-errors";
import { hasPermission } from "~/lib/auth/access/rbac";
import { queueLeadExportMutation } from "~/lib/mutations/integrations";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

import { useCreateLeadRecordAction } from "../record-index/leads/create-action";
import { useOpenLeadRecord } from "../record-index/leads/open-row";
import { workspaceColumnsForRole } from "./columns";
import {
  defaultWorkspaceView,
  parseWorkspaceView,
  resolveWorkspaceFilters,
} from "./model/filters";
import type { LeadWorkspaceViewId } from "./model/types";

import styles from "../record-index/leads/styles.module.css";

function titleForView(view: LeadWorkspaceViewId): string {
  switch (view) {
    case "review":
      return "Prospectos en revisión";
    case "quotation":
      return "Prospectos para cotización";
    case "all":
      return "Todos los prospectos";
    case "mine":
    default:
      return "Mis prospectos";
  }
}

export function LeadsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuthenticatedSession();
  const queueExport = useAction(queueLeadExportMutation);
  const [error, setError] = createSignal<string | null>(null);
  const [queuing, setQueuing] = createSignal(false);
  const createAction = useCreateLeadRecordAction();
  const { rowOpen } = useOpenLeadRecord();

  const activeView = (): LeadWorkspaceViewId =>
    parseWorkspaceView(
      typeof searchParams.view === "string" ? searchParams.view : undefined,
    ) ?? defaultWorkspaceView(currentUser().role);

  const queryFilters = () =>
    resolveWorkspaceFilters({
      view: activeView(),
      actorUserId: currentUser().id,
    });

  const leads = createAsync(() => leadListQuery(queryFilters()));

  async function handleExport() {
    setError(null);
    setQueuing(true);
    try {
      await queueExport();
    } catch (err) {
      setError(toAppError(err, "Error al encolar exportacion").publicMessage);
    } finally {
      setQueuing(false);
    }
  }

  const source = (): RecordIndexSource<LeadListRowView> => {
    const data = leads();
    const message = error();

    if (!data) {
      return { status: "pending", rows: [] };
    }

    return {
      status: "ready",
      rows: data.rows,
      totalCount: data.totalCount,
      error: message ? new Error(message) : undefined,
    };
  };

  const toolbarActions = (): ReadonlyArray<RecordIndexToolbarAction> => {
    const role = currentUser().role;
    const actions: RecordIndexToolbarAction[] = [];

    if (role !== "executive") {
      actions.push({
        id: "view-review",
        label: "Revisión",
        onClick: () => setSearchParams({ view: "review" }),
      });
    }
    actions.push({
      id: "view-mine",
      label: "Mis prospectos",
      onClick: () => setSearchParams({ view: "mine" }),
    });
    if (hasPermission(role, "lead:view:all")) {
      actions.push({
        id: "view-all",
        label: "Todos",
        onClick: () => setSearchParams({ view: "all" }),
      });
    }
    if (hasPermission(role, "quotation:manage")) {
      actions.push({
        id: "view-quotation",
        label: "Cotización",
        onClick: () => setSearchParams({ view: "quotation" }),
      });
    }
    if (hasPermission(role, "integration:manage")) {
      actions.push({
        id: "export",
        label: queuing() ? "Exportando..." : "Exportar",
        onClick: () => {
          void handleExport();
        },
      });
    }

    return actions;
  };

  const role = () => currentUser().role;

  const adapter = {
    id: "leads-workspace",
    title: titleForView(activeView()),
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gate-for-drag-select`,
    pickerIcon: List,
    columns: workspaceColumnsForRole(role()),
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      title: "No hay prospectos",
      description: "No existen resultados para esta vista.",
    },
    createAction: hasPermission(role(), "lead:register")
      ? createAction
      : undefined,
    toolbarActions: toolbarActions(),
  } satisfies RecordIndexAdapter<LeadListRowView>;

  return <RecordIndexScreen adapter={adapter} />;
}
