import { For } from "solid-js";

import type { UpdateFilter, UpdateFilterOption } from "~/lib/updates";

import styles from "./styles/filters.module.css";

type UpdatesFiltersProps = {
  active: UpdateFilter;
  onChange: (value: UpdateFilter) => void;
  options: readonly UpdateFilterOption[];
};

export function UpdatesFilters(props: UpdatesFiltersProps) {
  return (
    <nav class={styles.filterBar} aria-label="Update categories">
      <For each={props.options}>
        {(option) => (
          <button
            classList={{
              [styles.filterButton]: true,
              [styles.filterButtonActive]: props.active === option.value,
            }}
            onClick={() => props.onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )}
      </For>
    </nav>
  );
}
