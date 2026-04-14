import { For, Show } from "solid-js";

import { WithTooltip } from "~/components/ui/overflow-tooltip/overflow-tooltip";

import styles from "./styles.module.css";

export type FieldChipTone = "positive" | "neutral";

export type FieldChipItem = {
  id: string;
  label: string;
  tone?: FieldChipTone;
  tooltip?: string;
};

export function FieldChipList(props: {
  items: readonly FieldChipItem[];
  emptyLabel?: string;
}) {
  return (
    <Show when={props.items.length > 0} fallback={props.emptyLabel ?? "—"}>
      <div class={styles.container}>
        <div class={styles.list}>
          <For each={props.items}>
            {(item) => (
              <WithTooltip tooltip={item.tooltip ?? item.label}>
                <span
                  class={`${styles.chip} ${
                    item.tone === "positive"
                      ? styles.tonePositive
                      : styles.toneNeutral
                  }`}
                >
                  {item.label}
                </span>
              </WithTooltip>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
