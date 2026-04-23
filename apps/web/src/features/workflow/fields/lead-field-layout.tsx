import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import Checkbox from "~/components/icons/checkbox";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { RecordInlineCell } from "~/components/ui/field-row";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import { FieldTextValue } from "~/features/side-panel/components/field-table";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

export type FieldConfig = {
  key: string;
  label: string;
  renderCell: (data: LeadDetailView) => JSX.Element;
};

export const LEAD_DETAIL_FIELD_LAYOUT: FieldConfig[] = [
  {
    key: "ruc",
    label: "RUC",
    renderCell: (data) => (
      <RecordInlineCell label="RUC" icon={MapIcon}>
        <FieldTextValue>{data.lead.ruc}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "razonSocial",
    label: "Razón social",
    renderCell: (data) => (
      <RecordInlineCell label="Razón social" icon={Building2}>
        <FieldTextValue>{data.lead.razonSocial ?? ""}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "economicActivities",
    label: "Actividades",
    renderCell: (data) => (
      <RecordInlineCell label="Actividades" icon={Building2}>
        <FieldChipList
          emptyLabel="—"
          items={data.sourceStatus.sunat.economicActivities.map((activity) => ({
            id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
            label: activity.code,
            tone: activity.role === "principal" ? "positive" : "neutral",
            tooltip: `${activity.label} - ${activity.description}`,
          }))}
        />
      </RecordInlineCell>
    ),
  },
  {
    key: "status",
    label: "Estado",
    renderCell: (data) => (
      <RecordInlineCell label="Estado" icon={Package}>
        <FieldTextValue>{data.lead.status ?? ""}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "prioridad",
    label: "Prioridad",
    renderCell: (data) => (
      <RecordInlineCell label="Prioridad" icon={Checkbox}>
        <FieldTextValue>{data.lead.prioridad ?? ""}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "stage",
    label: "Etapa",
    renderCell: (data) => (
      <RecordInlineCell label="Etapa" icon={Package}>
        <FieldTextValue>{data.lead.stage}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "nextStep",
    label: "Siguiente paso",
    renderCell: (data) => (
      <RecordInlineCell label="Siguiente paso" icon={User}>
        <FieldTextValue>{data.lead.nextStep}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
  {
    key: "updatedAt",
    label: "Actualizado",
    renderCell: (data) => (
      <RecordInlineCell label="Actualizado" icon={Clock}>
        <FieldTextValue>{formatDateTime(data.lead.updatedAt)}</FieldTextValue>
      </RecordInlineCell>
    ),
  },
];
