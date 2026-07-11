import { For } from "solid-js";

import { Toggle } from "~/components/ui/input/toggle";

import styles from "./settings-toggle-card.module.css";

export type SettingsToggleRow = {
  id: string;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onToggle: (value: boolean) => void;
};

export function SettingsToggleCard(props: { rows: SettingsToggleRow[] }) {
  return (
    <div class={styles.card}>
      <For each={props.rows}>
        {(row, index) => (
          <div
            class={styles.row}
            data-divider={index() > 0 ? "true" : undefined}
          >
            <div class={styles.info}>
              <span class={styles.title}>{row.title}</span>
              <span class={styles.description}>{row.description}</span>
            </div>
            <span class={styles.toggleWrap}>
              <Toggle
                value={row.value}
                disabled={row.disabled}
                ariaLabel={row.title}
                onChange={row.onToggle}
              />
            </span>
          </div>
        )}
      </For>
    </div>
  );
}
