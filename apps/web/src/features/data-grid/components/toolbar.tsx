import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import type { DataGridPicker } from "../model/types";

import styles from "../styles/data-grid.module.css";

export function DataGridToolbar(props: {
  picker: DataGridPicker;
  pickerDropdown?: JSX.Element;
  rightContent: JSX.Element;
}) {
  const PickerIcon = props.picker.icon;

  return (
    <div class={styles.viewBar}>
      <div class={styles.viewBarTop}>
        <div class={styles.menuWrap}>
          <button
            type="button"
            class={styles.viewPicker}
            aria-haspopup={props.pickerDropdown ? "menu" : undefined}
            onClick={props.picker.onClick}
          >
            <span class={styles.viewPickerIcon}>
              <PickerIcon size={16} />
            </span>
            <span class={styles.viewPickerLabel}>{props.picker.label}</span>
            <span class={styles.viewPickerMeta}>
              {props.picker.meta ? `· ${props.picker.meta}` : null}
              <ChevronDown size={14} />
            </span>
          </button>
          {props.pickerDropdown}
        </div>
        <div class={styles.viewActions}>{props.rightContent}</div>
      </div>
    </div>
  );
}
