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
  showButtons?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function SettingsCounter(props: SettingsCounterProps) {
  function setValue(value: number): void {
    props.onChange(clamp(value, props.min, props.max));
  }

  function handleInput(
    event: InputEvent & { currentTarget: HTMLInputElement },
  ): void {
    const raw = event.currentTarget.value;

    if (raw === "") {
      return;
    }

    const value = Number(raw);
    if (!Number.isInteger(value)) {
      event.currentTarget.value = String(props.value);
      return;
    }

    setValue(value);
  }

  return (
    <div class={styles.counter}>
      {props.showButtons !== false && (
        <LightIconButton
          Icon={Minus}
          accent="secondary"
          aria-label="Disminuir"
          disabled={props.disabled || props.value <= props.min}
          onClick={() => setValue(props.value - 1)}
        />
      )}

      <input
        class={styles.input}
        type="number"
        inputmode="numeric"
        min={props.min}
        max={props.max}
        step="1"
        aria-label={props.ariaLabel}
        value={props.value}
        disabled={props.disabled}
        onInput={handleInput}
      />

      {props.showButtons !== false && (
        <LightIconButton
          Icon={Plus}
          accent="secondary"
          aria-label="Aumentar"
          disabled={props.disabled || props.value >= props.max}
          onClick={() => setValue(props.value + 1)}
        />
      )}
    </div>
  );
}
