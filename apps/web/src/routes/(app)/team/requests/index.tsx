import { createAsync, useAction } from "@solidjs/router";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import List from "~/components/icons/list";
import MessageSquare from "~/components/icons/message-square";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  approveCapacityRequestMutation,
  rejectCapacityRequestMutation,
} from "~/lib/mutations/capacity";
import { pendingCapacityRequestsQuery } from "~/lib/queries/capacity";
import type { PendingCapacityRequestView } from "~/server/capacity/application/contracts";

type TeamRequestRow = PendingCapacityRequestView;

export default function TeamRequestsPage() {
  const requests = createAsync(() => pendingCapacityRequestsQuery());
  const rows = () => requests() ?? [];
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
        <div class="flex gap-2">
          <Button type="button" onClick={() => void approve(request.id)}>
            Aprobar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void reject(request.id, "Rechazado desde la cola")}
          >
            Rechazar
          </Button>
        </div>
      ),
    },
  ] satisfies ReadonlyArray<DataGridColumn<TeamRequestRow>>;

  return (
    <AppPage width="wide">
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-semibold">Solicitudes pendientes</h2>
          <p class="text-sm text-muted-foreground">
            Aprueba o rechaza pedidos de capacidad.
          </p>
        </div>
        <DataGrid
          ariaLabel="Solicitudes del equipo"
          columns={[...columns]}
          emptyState={
            <p class="px-3 py-4 text-sm text-muted-foreground">
              No hay solicitudes pendientes.
            </p>
          }
          rowOpen={createNoopRowOpen()}
          source={{
            status: isLoading() ? "pending" : "ready",
            rows: rows(),
          }}
        />
      </div>
    </AppPage>
  );
}
