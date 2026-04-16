import { createSignal, Show, type JSX } from "solid-js";

import Pencil from "~/components/icons/pencil";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { UserPicker } from "~/components/ui/pickers/user-picker";
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
  currentUserId?: number;
  leadId?: number;
  onUpdate?: () => void;
}

export function RelationFieldRow(props: RelationFieldRowProps) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [showPicker, setShowPicker] = createSignal(false);

  function handleSelect() {
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
        <Show when={props.isEditable && props.leadId}>
          <div class={styles.editWrapper}>
            <Show when={isHovered()} fallback={<div class={styles.spacer} />}>
              <button
                type="button"
                class={styles.editButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPicker(true);
                }}
                aria-label={`Editar ${props.label}`}
              >
                <Pencil size={14} />
              </button>
            </Show>
            <Show when={showPicker()}>
              <UserPicker
                leadId={props.leadId}
                currentUserId={props.currentUserId ?? 0}
                onSelect={handleSelect}
                onClose={() => setShowPicker(false)}
              />
            </Show>
          </div>
        </Show>
      </FieldValue>
    </FieldRow>
  );
}
