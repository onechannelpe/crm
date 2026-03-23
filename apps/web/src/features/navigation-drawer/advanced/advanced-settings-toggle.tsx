import Point from "~/components/icons/point";

import styles from "./advanced-settings-toggle.module.css";

interface AdvancedSettingsToggleProps {
  isAdvancedModeEnabled: boolean;
  setIsAdvancedModeEnabled: (enabled: boolean) => void;
  label?: string;
}

export function AdvancedSettingsToggle(props: AdvancedSettingsToggleProps) {
  const toggle = () => {
    props.setIsAdvancedModeEnabled(!props.isAdvancedModeEnabled);
  };

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
      <label class={styles.toggleContainer}>
        <span class={styles.text}>{props.label ?? "Avanzado:"}</span>
        <button
          type="button"
          role="switch"
          aria-checked={props.isAdvancedModeEnabled}
          class={
            props.isAdvancedModeEnabled
              ? `${styles.switch} ${styles.switchChecked}`
              : styles.switch
          }
          onClick={toggle}
        >
          <span class={styles.thumb} />
        </button>
      </label>
    </div>
  );
}
