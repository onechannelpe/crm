import { createAsync, useNavigate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import List from "~/components/icons/list";
import Mail from "~/components/icons/mail";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Input } from "~/components/ui/input/input";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { ManagedExecutiveView } from "~/contracts/capacity";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { managedExecutivesQuery } from "~/lib/queries/capacity";

import styles from "./team-page.module.css";

type ManagedExecutiveGridRow = ManagedExecutiveView & {
  id: string;
  executiveId: string;
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
      <div class={styles.stackedCell}>
        <div class={styles.executiveName}>{executive.fullName}</div>
        <div class={styles.executiveEmail}>{executive.email}</div>
      </div>
    ),
  },
  {
    key: "searchStatus",
    label: "Búsquedas",
    icon: CircleQuestionMark,
    width: 220,
    renderCell: (executive) => (
      <div class={styles.stackedCell}>
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
      <div class={styles.stackedCell}>
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
  const openExecutive = (executive: ManagedExecutiveGridRow) => {
    navigate(`/settings/members/${executive.executiveId}?tab=capacity`);
  };

  return (
    <AppPage width="wide">
      <FilterBar>
        <div class={styles.search}>
          <Input
            label="Buscar ejecutivo"
            value={filter()}
            onInput={(event) => setFilter(event.currentTarget.value)}
            placeholder="Nombre o correo"
          />
        </div>
      </FilterBar>

      <DataGrid
        ariaLabel="Equipo"
        columns={TEAM_COLUMNS}
        emptyState="No hay ejecutivos visibles."
        onRowOpen={openExecutive}
        rowOpenIndicator="route"
        source={{
          status: isLoading() ? "pending" : "ready",
          rows: filtered(),
        }}
      />
    </AppPage>
  );
}
