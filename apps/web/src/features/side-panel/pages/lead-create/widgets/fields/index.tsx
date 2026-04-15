import { createSignal, For } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
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

import { FIELD_ROWS } from "../../constants";

type LeadCreateFieldsWidgetProps = {
  razonSocial?: string | null;
  address?: string | null;
};

export function FieldsWidget(props: LeadCreateFieldsWidgetProps) {
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [hoveredFieldKey, setHoveredFieldKey] = createSignal<string | null>(
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
                  hovered={hoveredFieldKey() === (field.key ?? field.label)}
                  onMouseEnter={() =>
                    setHoveredFieldKey(field.key ?? field.label)
                  }
                  onMouseLeave={() => setHoveredFieldKey(null)}
                  onFocusIn={() => setHoveredFieldKey(field.key ?? field.label)}
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
                    <FieldTextValue>
                      {field.key === "razonSocial"
                        ? (props.razonSocial ?? "")
                        : field.key === "address"
                          ? (props.address ?? "")
                          : (field.value ?? "")}
                    </FieldTextValue>
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
