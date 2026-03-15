import { A, createAsync } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Input } from "~/components/ui/input/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { managedExecutivesQuery } from "~/lib/queries/team-admin";

export default function TeamPage() {
  const executives = createAsync(() => managedExecutivesQuery(), {
    initialValue: [],
  });
  const [filter, setFilter] = createSignal("");
  const filtered = createMemo(() => {
    const value = filter().trim().toLowerCase();
    if (!value) return executives();
    return executives().filter((executive) =>
      `${executive.fullName} ${executive.email}`.toLowerCase().includes(value),
    );
  });

  return (
    <AppPage width="full">
      <div class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold">Capacidad del equipo</h2>
            <p class="text-sm text-muted-foreground">
              Gestiona políticas, uso y excepciones por ejecutivo.
            </p>
          </div>
          <div class="flex gap-2">
            <A href="/team/requests" class="underline">
              Solicitudes pendientes
            </A>
            <A href="/settings/sales-policies" class="underline">
              Políticas
            </A>
          </div>
        </div>

        <Input
          label="Buscar ejecutivo"
          value={filter()}
          onInput={(event) => setFilter(event.currentTarget.value)}
          placeholder="Nombre o correo"
        />

        <Show
          when={filtered().length > 0}
          fallback={<p class="text-sm text-muted-foreground">No hay ejecutivos visibles.</p>}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ejecutivo</TableHead>
                <TableHead>Búsquedas</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={filtered()}>
                {(executive) => (
                  <TableRow>
                    <TableCell>
                      <div class="space-y-1">
                        <div class="font-medium">{executive.fullName}</div>
                        <div class="text-xs text-muted-foreground">
                          {executive.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="space-y-1">
                        <div>
                          {executive.searchStatus.usedAmount}/
                          {executive.searchStatus.monthlySearchLimit +
                            executive.searchStatus.extraGranted}
                        </div>
                        <Badge variant="outline">
                          {executive.searchStatus.remaining} restantes
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="space-y-1">
                        <div>
                          {executive.leadStatus.activeAssignments}/
                          {executive.leadStatus.activeBufferTarget} activos
                        </div>
                        <Badge variant="outline">
                          {executive.leadStatus.remaining} refills restantes
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <A
                        href={`/team/members/${executive.id}`}
                        class="underline"
                      >
                        Abrir
                      </A>
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
