import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import styles from "../styles/data-grid.module.css";

type ToolbarSlot = () => JSX.Element;

type DataGridToolbarPicker = {
  label: string;
  meta?: string;
  onClick?: () => void;
  hasDropdown: boolean;
  renderIcon: ToolbarSlot;
};

export function DataGridToolbar(props: {
  picker: DataGridToolbarPicker;
  slots: {
    dropdown?: ToolbarSlot;
    actions: ToolbarSlot;
  };
}) {
  return (
    <div class={styles.viewBar}>
      <div class={styles.viewBarTop}>
        <div class={styles.menuWrap}>
          <button
            type="button"
            class={styles.viewPicker}
            aria-haspopup={props.picker.hasDropdown ? "menu" : undefined}
            onClick={props.picker.onClick}
          >
            <span class={styles.viewPickerIcon}>
              {props.picker.renderIcon()}
            </span>
            <span class={styles.viewPickerLabel}>{props.picker.label}</span>
            <span class={styles.viewPickerMeta}>
              {props.picker.meta ? `· ${props.picker.meta}` : null}
              <ChevronDown size={14} />
            </span>
          </button>
          {props.slots.dropdown?.()}
        </div>
        <div class={styles.viewActions}>{props.slots.actions()}</div>
      </div>
    </div>
  );
}
