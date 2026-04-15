import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import {
  FieldIcon,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
  FieldTextValue,
  FieldValue,
} from "~/features/side-panel/components/field-table";
import {
  WidgetBody,
  Widget,
  WidgetHeader,
  WidgetSectionChevron,
  WidgetSectionHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "../../constants";

type FieldKey = (typeof FIELD_ROWS)[number]["key"];

function renderTextField(data: LeadDetailView, key: FieldKey): string {
  if (key === "ruc") return data.lead.ruc;
  if (key === "razonSocial") return data.lead.razonSocial ?? "";
  if (key === "status") return data.lead.status ?? "";
  if (key === "prioridad") return data.lead.prioridad ?? "";
  if (key === "stage") return data.lead.stage;
  if (key === "nextStep") return data.lead.nextStep;
  if (key === "updatedAt") return formatDateTime(data.lead.updatedAt);
  return "";
}

function renderFieldValue(data: LeadDetailView, key: FieldKey): JSX.Element {
  if (key === "economicActivities") {
    return (
      <FieldChipList
        emptyLabel="—"
        items={data.sourceStatus.sunat.economicActivities.map((activity) => ({
          id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
          label: activity.code,
          tone: activity.role === "principal" ? "positive" : "neutral",
          tooltip: `${activity.label} - ${activity.description}`,
        }))}
      />
    );
  }

  return <FieldTextValue>{renderTextField(data, key)}</FieldTextValue>;
}

export function FieldsWidget(props: { data: LeadDetailView }) {
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [hoveredFieldKey, setHoveredFieldKey] = createSignal<FieldKey | null>(
    null,
  );

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Campos" />
      </WidgetHeader>
      <WidgetBody>
        <WidgetSectionHeader
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>General</span>
          <WidgetSectionChevron isExpanded={isExpanded()}>
            <ChevronDown size={14} />
          </WidgetSectionChevron>
        </WidgetSectionHeader>
        <AnimatedExpandableContainer isExpanded={isExpanded()}>
          <FieldTable>
            <For each={FIELD_ROWS}>
              {(field) => (
                <FieldRow
                  readonly
                  hovered={hoveredFieldKey() === field.key}
                  onMouseEnter={() => setHoveredFieldKey(field.key)}
                  onMouseLeave={() => setHoveredFieldKey(null)}
                  onFocusIn={() => setHoveredFieldKey(field.key)}
                  onFocusOut={() => setHoveredFieldKey(null)}
                >
                  <FieldLabel>
                    <FieldIcon>
                      <field.icon size={16} />
                    </FieldIcon>
                    <FieldLabelText>
                      <OverflowingText
                        text={field.label}
                        style={{ width: "100%" }}
                      />
                    </FieldLabelText>
                  </FieldLabel>
                  <FieldValue>
                    {renderFieldValue(props.data, field.key)}
                  </FieldValue>
                </FieldRow>
              )}
            </For>
          </FieldTable>
        </AnimatedExpandableContainer>
      </WidgetBody>
    </Widget>
  );
}
