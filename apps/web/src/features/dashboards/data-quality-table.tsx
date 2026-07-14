import { Show } from "solid-js";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import { Badge } from "~/components/ui/display/badge";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import type { DataQualitySummary } from "~/server/merchant-stats/read/contracts";

import { formatInteger } from "./format";

type DataQualityRow = {
  id: string;
  check: string;
  count: number;
};

const DATA_QUALITY_COLUMNS = [
  {
    key: "check",
    label: "Control",
    icon: CircleCheckBig,
    minWidth: 280,
    grow: true,
    sticky: true,
    renderCell: (row) => row.check,
  },
  {
    key: "count",
    label: "Pendientes",
    icon: CircleAlert,
    width: 140,
    renderCell: (row) => (
      <Show when={row.count > 0} fallback={formatInteger(row.count)}>
        <Badge variant="warning">{formatInteger(row.count)}</Badge>
      </Show>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<DataQualityRow>>;

export function DataQualityTable(props: { summary: DataQualitySummary }) {
  const rows = (): DataQualityRow[] => [
    {
      id: "unmatched-rucs",
      check: "RUCs sin registrar en CRM",
      count: props.summary.unmatchedRucs,
    },
    {
      id: "accounts-missing-seller",
      check: "Cuentas sin vendedor real",
      count: props.summary.accountsMissingSeller,
    },
    {
      id: "accounts-missing-projected",
      check: "Cuentas sin proyectado",
      count: props.summary.accountsMissingProjected,
    },
    {
      id: "serial-mismatches",
      check: "Series que no cuadran con entregas",
      count: props.summary.serialMismatches,
    },
  ];

  return (
    <DataGrid
      ariaLabel="Calidad de datos"
      columns={DATA_QUALITY_COLUMNS}
      emptyState="No hay controles de calidad configurados."
      source={{ status: "ready", rows: rows() }}
    />
  );
}
