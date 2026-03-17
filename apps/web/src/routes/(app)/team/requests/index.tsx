import { createAsync, useAction } from "@solidjs/router";
import { For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import {
  approveCapacityRequestMutation,
  rejectCapacityRequestMutation,
} from "~/lib/mutations/capacity";
import { pendingCapacityRequestsQuery } from "~/lib/queries/capacity";

export default function TeamRequestsPage() {
  const requests = createAsync(() => pendingCapacityRequestsQuery(), {
    initialValue: [],
  });
  const approve = useAction(approveCapacityRequestMutation);
  const reject = useAction(rejectCapacityRequestMutation);

  return (
    <AppPage width="wide">
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-semibold">Solicitudes pendientes</h2>
          <p class="text-sm text-muted-foreground">
            Aprueba o rechaza pedidos de capacidad.
          </p>
        </div>
        <Show
          when={requests().length > 0}
          fallback={
            <p class="text-sm text-muted-foreground">
              No hay solicitudes pendientes.
            </p>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ejecutivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={requests()}>
                {(request) => (
                  <TableRow>
                    <TableCell>
                      {request.names} {request.first_surname}{" "}
                      {request.second_surname}
                    </TableCell>
                    <TableCell>
                      {request.kind === "search_extra"
                        ? "Más búsquedas"
                        : "Más refills"}
                    </TableCell>
                    <TableCell>{request.requested_amount}</TableCell>
                    <TableCell>{request.reason}</TableCell>
                    <TableCell>
                      <div class="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => void approve(request.id)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void reject(request.id, "Rechazado desde la cola")
                          }
                        >
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </div>
    </AppPage>
  );
}
