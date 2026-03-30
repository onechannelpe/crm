import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import type { DataGridPicker } from "../model/data-grid-types";

import styles from "../styles/data-grid.module.css";

export function DataGridToolbar(props: {
  picker: DataGridPicker;
  rightContent: JSX.Element;
}) {
  const PickerIcon = props.picker.icon;

  return (
    <div class={styles.viewBar}>
      <div class={styles.viewBarTop}>
        <button
          type="button"
          class={styles.viewPicker}
          onClick={props.picker.onClick}
        >
          <span class={styles.viewPickerIcon}>
            <PickerIcon size={16} />
          </span>
          <span class={styles.viewPickerLabel}>{props.picker.label}</span>
          <span class={styles.viewPickerMeta}>
            {typeof props.picker.count === "number"
              ? `· ${props.picker.count}`
              : null}
            <ChevronDown size={14} />
          </span>
        </button>
        <div class={styles.viewActions}>{props.rightContent}</div>
      </div>
    </div>
  );
}
