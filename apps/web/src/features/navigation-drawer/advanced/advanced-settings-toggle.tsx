import { Toggle } from "~/components/ui/input/toggle";

import styles from "./advanced-settings-toggle.module.css";

interface AdvancedSettingsToggleProps {
  isAdvancedModeEnabled: boolean;
  setIsAdvancedModeEnabled: (enabled: boolean) => void;
  label?: string;
}

export function AdvancedSettingsToggle(props: AdvancedSettingsToggleProps) {
  const label = () => props.label ?? "Avanzado:";

  return (
    <div class={styles.container}>
      <span class={styles.text}>{label()}</span>
      <Toggle
        value={props.isAdvancedModeEnabled}
        onChange={props.setIsAdvancedModeEnabled}
        ariaLabel={label()}
        color="var(--warning)"
      />
    </div>
  );
}
