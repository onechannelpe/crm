import Minus from "~/components/icons/minus";
import Plus from "~/components/icons/plus";
import { LightIconButton } from "~/components/ui/input/light-icon-button";

import styles from "./settings-counter.module.css";

interface SettingsCounterProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  ariaLabel: string;
  disabled?: boolean;
}

export function SettingsCounter(props: SettingsCounterProps) {
  function clamp(value: number): number {
    return Math.min(props.max, Math.max(props.min, value));
  }

  function handleInput(raw: string): void {
    const parsed = Number(raw);

    if (Number.isNaN(parsed)) {
      return;
    }

    props.onChange(clamp(parsed));
  }

  return (
    <div class={styles.counter}>
      <LightIconButton
        Icon={Minus}
        accent="secondary"
        aria-label="Disminuir"
        disabled={props.disabled || props.value <= props.min}
        onClick={() => props.onChange(clamp(props.value - 1))}
      />

      <input
        class={styles.input}
        type="number"
        inputmode="numeric"
        min={props.min}
        max={props.max}
        aria-label={props.ariaLabel}
        value={props.value}
        disabled={props.disabled}
        onInput={(event) => handleInput(event.currentTarget.value)}
      />

      <LightIconButton
        Icon={Plus}
        accent="secondary"
        aria-label="Aumentar"
        disabled={props.disabled || props.value >= props.max}
        onClick={() => props.onChange(clamp(props.value + 1))}
      />
    </div>
  );
}
