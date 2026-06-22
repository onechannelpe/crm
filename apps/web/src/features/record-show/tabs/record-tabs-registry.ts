import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Checkbox from "~/components/icons/checkbox";
import Plus from "~/components/icons/plus";
import HomeTabler from "~/components/icons/home-tabler";
import MessageSquare from "~/components/icons/message-square";
import Paperclip from "~/components/icons/paperclip";
import TimelineEvent from "~/components/icons/timeline-event";
import type { LeadStage } from "~/contracts/workflow/vocabulary";
import { ActividadTab } from "~/features/record-show/actividad/actividad-tab";
import { AfiliacionTab } from "~/features/record-show/afiliacion/afiliacion-tab";
import { DatosTab } from "~/features/record-show/datos/datos-tab";
import type { RecordContext } from "~/features/record-show/model/record-context";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { NotasTab } from "~/features/record-show/notas/notas-tab";
import { RegistroTab } from "~/features/record-show/registro/registro-tab";
import { ResumenTab } from "~/features/record-show/resumen/resumen-tab";
import { FilesTab } from "~/features/record-show/tabs/files-tab";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip";

type RecordTabKind = RecordContext["kind"];

export type RecordTabDefinition = {
  id: RecordTabId;
  label: string;
  infoLabel?: string;
  icon?: TabIconComponent;
  // Coarse visibility by record kind. Drives active-tab resolution where only the
  // kind is known (the persisted tab id, before the lead detail is loaded).
  kinds: RecordTabKind[];
  // Fine visibility within a lead, by stage. Applied by the render layer, which
  // has the full context.
  stageGate?: (stage: LeadStage) => boolean;
  component: (props: {
    context: RecordContext;
    onNavigate: (id: RecordTabId) => void;
  }) => JSX.Element;
};

const LEAD: RecordTabKind[] = ["lead"];
const DRAFT: RecordTabKind[] = ["draft"];
const BOTH: RecordTabKind[] = ["lead", "draft"];

const inAfiliacion = (stage: LeadStage) =>
  stage === "SETUP" || stage === "LIVE";

const RECORD_TABS: readonly RecordTabDefinition[] = [
  {
    id: "registro",
    icon: Plus,
    label: "Registro",
    kinds: DRAFT,
    component: RegistroTab,
  },
  {
    id: "resumen",
    icon: Checkbox,
    label: "Resumen",
    kinds: LEAD,
    component: ResumenTab,
  },
  {
    id: "datos",
    icon: HomeTabler,
    label: "Datos",
    kinds: LEAD,
    component: DatosTab,
  },
  {
    id: "afiliacion",
    icon: Building2,
    label: "Afiliación",
    kinds: LEAD,
    stageGate: inAfiliacion,
    component: AfiliacionTab,
  },
  {
    id: "notas",
    icon: MessageSquare,
    label: "Notas",
    kinds: LEAD,
    component: NotasTab,
  },
  {
    id: "actividad",
    icon: TimelineEvent,
    label: "Actividad",
    kinds: BOTH,
    component: ActividadTab,
  },
  {
    id: "archivos",
    icon: Paperclip,
    label: "Archivos",
    kinds: LEAD,
    component: FilesTab,
  },
];

function tabAppears(tab: RecordTabDefinition, context: RecordContext): boolean {
  if (!tab.kinds.includes(context.kind)) return false;
  if (tab.stageGate && context.kind === "lead") {
    return tab.stageGate(context.data.lead.stage);
  }
  return true;
}

export function recordTabsFor(context: RecordContext): RecordTabDefinition[] {
  return RECORD_TABS.filter((tab) => tabAppears(tab, context));
}

export function resolveActiveRecordTabId(
  tabId: string,
  kind: RecordTabKind,
): RecordTabId {
  const available = RECORD_TABS.filter((tab) => tab.kinds.includes(kind));
  const match = available.find((tab) => tab.id === tabId);
  return match ? match.id : available[0].id;
}

// Side-panel chrome shows the active tab's label (preferring an info label).
// Looked up from the same registry so labels never drift from tabs.
export function recordTabDisplayLabel(tabId: RecordTabId): string {
  const tab = RECORD_TABS.find((entry) => entry.id === tabId);
  return tab?.infoLabel ?? tab?.label ?? "";
}
