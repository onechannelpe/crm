import { createSignal, Show, type JSX } from "solid-js";

import Pencil from "~/components/icons/pencil";
import { EditButtonWrapper } from "~/components/ui/input/edit-button-wrapper";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import {
  FieldIcon,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldValue,
} from "~/features/side-panel/components/field-table";

import styles from "./styles.module.css";

export interface RelationFieldRowProps {
  label: string;
  icon: (props: { size?: number }) => JSX.Element;
  value: string;
  isEditable?: boolean;
  renderPicker?: (onClose: () => void) => JSX.Element;
  onUpdate?: () => void;
}

export function RelationFieldRow(props: RelationFieldRowProps) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [showPicker, setShowPicker] = createSignal(false);

  function handlePickerClose() {
    setShowPicker(false);
    props.onUpdate?.();
  }

  return (
    <FieldRow
      hovered={isHovered()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FieldLabel>
        <FieldIcon>
          <props.icon size={16} />
        </FieldIcon>
        <FieldLabelText>
          <OverflowingText text={props.label} style={{ width: "100%" }} />
        </FieldLabelText>
      </FieldLabel>
      <FieldValue>
        <span>{props.value || "—"}</span>
        <Show when={props.isEditable}>
          <div class={styles.editWrapper}>
            <EditButtonWrapper visible={isHovered()}>
              <LightIconButton
                Icon={Pencil}
                aria-label={`Editar ${props.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPicker(true);
                }}
              />
            </EditButtonWrapper>
            <Show when={showPicker()}>
              {props.renderPicker?.(handlePickerClose)}
            </Show>
          </div>
        </Show>
      </FieldValue>
    </FieldRow>
  );
}
