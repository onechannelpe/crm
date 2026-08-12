import { clsx } from "clsx";
import { createUniqueId } from "solid-js";

import Point from "~/components/icons/point";

import styles from "./advanced-settings-toggle.module.css";

interface AdvancedSettingsToggleProps {
  isAdvancedModeEnabled: boolean;
  setIsAdvancedModeEnabled: (enabled: boolean) => void;
  label?: string;
}

export function AdvancedSettingsToggle(props: AdvancedSettingsToggleProps) {
  const labelId = createUniqueId();

  return (
    <div class={styles.container}>
      <div class={styles.iconContainer} aria-hidden="true">
        <Point
          size={12}
          color="var(--warning)"
          fill="var(--warning)"
          strokeWidth={2}
        />
      </div>
      <span id={labelId} class={styles.text}>
        {props.label ?? "Avanzado:"}
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={labelId}
        aria-checked={props.isAdvancedModeEnabled}
        class={clsx(
          styles.switch,
          props.isAdvancedModeEnabled && styles.switchChecked,
        )}
        onClick={() =>
          props.setIsAdvancedModeEnabled(!props.isAdvancedModeEnabled)
        }
      >
        <span class={styles.thumb} />
      </button>
    </div>
  );
}
