import { createAsync, useAction } from "@solidjs/router";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import List from "~/components/icons/list";
import MessageSquare from "~/components/icons/message-square";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import type { PendingCapacityRequestView } from "~/contracts/capacity";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  approveCapacityRequestMutation,
  rejectCapacityRequestMutation,
} from "~/lib/mutations/capacity";
import { pendingCapacityRequestsQuery } from "~/lib/queries/capacity";

import styles from "./requests-page.module.css";

type PendingCapacityRequestGridRow = Omit<PendingCapacityRequestView, "id"> & {
  id: string;
  requestId: string;
};

export default function TeamRequestsPage() {
  const requests = createAsync(() => pendingCapacityRequestsQuery());
  const rows = (): PendingCapacityRequestGridRow[] =>
    (requests() ?? []).map((request) =>
      Object.assign({}, request, {
        id: `capacity-request:${request.id}`,
        requestId: request.id,
      }),
    );
  const isLoading = () => requests() === undefined;
  const approve = useAction(approveCapacityRequestMutation);
  const reject = useAction(rejectCapacityRequestMutation);
  const columns = [
    {
      key: "names",
      label: "Ejecutivo",
      icon: UserRound,
      minWidth: 240,
      grow: true,
      sticky: true,
      renderCell: (request) =>
        `${request.names} ${request.firstSurname} ${request.secondSurname}`,
    },
    {
      key: "kind",
      label: "Tipo",
      icon: List,
      width: 160,
      renderCell: (request) =>
        request.kind === "search_extra" ? "Más búsquedas" : "Más refills",
    },
    {
      key: "requestedAmount",
      label: "Cantidad",
      icon: CircleQuestionMark,
      width: 120,
      renderCell: (request) => request.requestedAmount,
    },
    {
      key: "reason",
      label: "Motivo",
      icon: MessageSquare,
      minWidth: 260,
      grow: true,
      renderCell: (request) => request.reason,
    },
    {
      key: "actions",
      label: "Acciones",
      icon: CircleQuestionMark,
      width: 240,
      renderCell: (request) => (
        <div class={styles.rowActions}>
          <Button type="button" onClick={() => void approve(request.requestId)}>
            Aprobar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void reject(request.requestId, "Rechazado desde la cola")
            }
          >
            Rechazar
          </Button>
        </div>
      ),
    },
  ] satisfies ReadonlyArray<DataGridColumn<PendingCapacityRequestGridRow>>;

  return (
    <AppPage width="wide">
      <DataGrid
        ariaLabel="Solicitudes del equipo"
        columns={columns}
        emptyState="No hay solicitudes pendientes."
        source={{
          status: isLoading() ? "pending" : "ready",
          rows: rows(),
        }}
      />
    </AppPage>
  );
}
