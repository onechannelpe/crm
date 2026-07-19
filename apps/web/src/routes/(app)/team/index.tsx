import { createAsync, useNavigate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import List from "~/components/icons/list";
import Mail from "~/components/icons/mail";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Input } from "~/components/ui/input/input";
import { DataTable } from "~/components/ui/layout/data-table";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { TableColumn } from "~/components/ui/layout/table-column";
import type { ManagedExecutiveView } from "~/contracts/capacity";
import { managedExecutivesQuery } from "~/lib/queries/capacity";

import styles from "./team-page.module.css";

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
    label: "Clientes",
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
    label: "Categoría",
    icon: UserRound,
    width: 130,
    renderCell: (executive) =>
      executive.executiveCategory
        ? executive.executiveCategory.charAt(0).toUpperCase() +
          executive.executiveCategory.slice(1)
        : "—",
  },
] satisfies ReadonlyArray<TableColumn<ManagedExecutiveView>>;

export default function TeamPage() {
  const navigate = useNavigate();
  const executives = createAsync(() => managedExecutivesQuery());
  const [filter, setFilter] = createSignal("");
  const filtered = createMemo(() => {
    const value = filter().trim().toLowerCase();
    const rows = executives() ?? [];
    if (!value) return rows;
    return rows.filter((executive) =>
      `${executive.fullName} ${executive.email}`.toLowerCase().includes(value),
    );
  });
  const isLoading = () => executives() === undefined;
  const openExecutive = (executive: ManagedExecutiveView) => {
    navigate(`/settings/members/${executive.id}?tab=capacity`);
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

      <DataTable
        ariaLabel="Equipo"
        columns={TEAM_COLUMNS}
        emptyState="No hay ejecutivos visibles."
        onRowClick={openExecutive}
        rows={filtered()}
        status={isLoading() ? "pending" : "ready"}
      />
    </AppPage>
  );
}
