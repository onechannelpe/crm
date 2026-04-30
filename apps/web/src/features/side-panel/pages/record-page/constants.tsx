import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import TimelineEvent from "~/components/icons/timeline-event";

import type { TabItem } from "../../components/tab-strip";
import {
  LEAD_RECORD_PRIMARY_TABS,
  LEAD_RECORD_SECONDARY_TABS,
  type LeadRecordTabId,
} from "./model";

export const ALL_TAB_ITEMS: ReadonlyArray<TabItem<LeadRecordTabId>> = [
  { id: LEAD_RECORD_PRIMARY_TABS[0], icon: HomeTabler, label: "Inicio" },
  {
    id: LEAD_RECORD_PRIMARY_TABS[1],
    icon: TimelineEvent,
    label: "Línea de tiempo",
  },
  { id: LEAD_RECORD_PRIMARY_TABS[2], icon: Checkbox, label: "Tareas" },
  { id: LEAD_RECORD_SECONDARY_TABS[0], label: "Sedes" },
  { id: LEAD_RECORD_SECONDARY_TABS[1], label: "Notas" },
  { id: LEAD_RECORD_SECONDARY_TABS[2], label: "Archivos" },
  { id: LEAD_RECORD_SECONDARY_TABS[3], label: "Correos" },
  { id: LEAD_RECORD_SECONDARY_TABS[4], label: "Calendario" },
];
