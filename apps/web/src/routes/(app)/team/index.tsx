import { A, createAsync, useNavigate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import type { ManagedExecutiveView } from "~/actions/capacity/contracts";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import List from "~/components/icons/list";
import Mail from "~/components/icons/mail";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Input } from "~/components/ui/input/input";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { managedExecutivesQuery } from "~/lib/queries/capacity";

type ManagedExecutiveGridRow = ManagedExecutiveView & {
  id: string;
  executiveId: number;
};

const TEAM_COLUMNS = [
  {
    key: "fullName",
    label: "Ejecutivo",
    icon: UserRound,
    minWidth: 240,
    grow: true,
    sticky: true,
    renderCell: (executive) => (
      <div class="space-y-1">
        <div class="font-medium">{executive.fullName}</div>
        <div class="text-xs text-muted-foreground">{executive.email}</div>
      </div>
    ),
  },
  {
    key: "searchStatus",
    label: "Búsquedas",
    icon: CircleQuestionMark,
    width: 220,
    renderCell: (executive) => (
      <div class="space-y-1">
        <div>
          {executive.searchStatus.committed}/
          {executive.searchStatus.policy.monthlyLimit +
            executive.searchStatus.granted}
        </div>
        <Badge variant="outline">
          {executive.searchStatus.remaining} restantes
        </Badge>
      </div>
    ),
  },
  {
    key: "leadStatus",
    label: "Leads",
    icon: List,
    width: 220,
    renderCell: (executive) => (
      <div class="space-y-1">
        <div>
          {executive.leadStatus.activeAssignments}/
          {executive.leadStatus.policy.bufferTarget} activos
        </div>
        <Badge variant="outline">
          {executive.leadStatus.remaining} refills restantes
        </Badge>
      </div>
    ),
  },
  {
    key: "email",
    label: "Correo",
    icon: Mail,
    minWidth: 220,
    grow: true,
    renderCell: (executive) => executive.email,
  },
  {
    key: "executiveCategory",
    label: "Categoria",
    icon: UserRound,
    width: 130,
    renderCell: (executive) =>
      executive.executiveCategory
        ? executive.executiveCategory.charAt(0).toUpperCase() +
          executive.executiveCategory.slice(1)
        : "—",
  },
] satisfies ReadonlyArray<DataGridColumn<ManagedExecutiveGridRow>>;

export default function TeamPage() {
  const navigate = useNavigate();
  const executives = createAsync(() => managedExecutivesQuery());
  const [filter, setFilter] = createSignal("");
  const filtered = createMemo(() => {
    const value = filter().trim().toLowerCase();
    const rows: ManagedExecutiveGridRow[] = (executives() ?? []).map(
      (executive) =>
        Object.assign({}, executive, {
          id: `team-executive:${executive.id}`,
          executiveId: executive.id,
        }),
    );
    if (!value) return rows;
    return rows.filter((executive) =>
      `${executive.fullName} ${executive.email}`.toLowerCase().includes(value),
    );
  });
  const isLoading = () => executives() === undefined;
  const rowOpen = createRouteRowOpen<ManagedExecutiveGridRow>((executive) => {
    navigate(`/team/members/${executive.executiveId}/capacity`);
  });

  return (
    <AppPage width="wide">
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
            <A href="/settings/capacity-policies" class="underline">
              Políticas
            </A>
            <A href="/settings/capacity-audit" class="underline">
              Audit
            </A>
          </div>
        </div>

        <Input
          label="Buscar ejecutivo"
          value={filter()}
          onInput={(event) => setFilter(event.currentTarget.value)}
          placeholder="Nombre o correo"
        />

        <DataGrid
          ariaLabel="Equipo"
          columns={[...TEAM_COLUMNS]}
          emptyState={
            <p class="px-3 py-4 text-sm text-muted-foreground">
              No hay ejecutivos visibles.
            </p>
          }
          rowOpen={rowOpen}
          source={{
            status: isLoading() ? "pending" : "ready",
            rows: filtered(),
          }}
        />
      </div>
    </AppPage>
  );
}
