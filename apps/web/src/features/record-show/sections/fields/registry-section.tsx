import { Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Checkbox from "~/components/icons/checkbox";
import ChevronDown from "~/components/icons/chevron-down";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import type { LeadDetailView } from "~/contracts/workflow/views";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/widgets/field-table";
import {
  WidgetCardSubsectionChevron,
  WidgetCardSubsectionHeader,
} from "~/features/widgets/widget-card";
import { capitalize } from "~/lib/utils";

// The SUNAT registry (RUC, legal name, address, contributor status, economic
// activities) is stable reference data about the company, not the deal's own
// working attributes. Twenty would keep it behind a relation rather than inline,
// so it lives in a collapsed section that stays out of the way until needed.
export function RegistrySection(props: { data: LeadDetailView }) {
  const [isExpanded, setIsExpanded] = createSignal(false);

  const lead = () => props.data.lead;
  const sunat = () => props.data.sourceStatus.sunat;

  return (
    <>
      <WidgetCardSubsectionHeader onClick={() => setIsExpanded((v) => !v)}>
        <span>Empresa</span>
        <WidgetCardSubsectionChevron isExpanded={isExpanded()}>
          <ChevronDown size={14} />
        </WidgetCardSubsectionChevron>
      </WidgetCardSubsectionHeader>
      <AnimatedExpandableContainer isExpanded={isExpanded()}>
        <FieldTable>
          <RecordInlineCell label="RUC" icon={Building2}>
            <FieldTextValue>{lead().ruc}</FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell
            label="Razón social"
            icon={Building2}
            empty={!lead().legalName}
          >
            <FieldTextValue>{lead().legalName}</FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell
            label="Dirección"
            icon={MapIcon}
            empty={!lead().address}
          >
            <FieldTextValue>{lead().address}</FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell
            label="Estado del contribuyente"
            icon={Building2}
            empty={!sunat().contributorStatus}
          >
            <FieldTextValue>{sunat().contributorStatus}</FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell
            label="Condición"
            icon={Checkbox}
            empty={!sunat().contributorCondition}
          >
            <FieldTextValue>{sunat().contributorCondition}</FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell
            label="Actividades económicas"
            icon={Package}
            empty={sunat().economicActivities.length === 0}
          >
            <FieldChipList
              items={sunat().economicActivities.map((activity) => ({
                id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
                label: activity.code,
                tone: activity.role === "principal" ? "positive" : "neutral",
                tooltip: `${activity.label} - ${activity.description}`,
              }))}
            />
          </RecordInlineCell>

          <RecordInlineCell
            label="Estado"
            icon={Package}
            empty={lead().status === null}
          >
            <FieldTextValue>
              <Show when={lead().status} keyed>
                {(status) => capitalize(status)}
              </Show>
            </FieldTextValue>
          </RecordInlineCell>
        </FieldTable>
      </AnimatedExpandableContainer>
    </>
  );
}
