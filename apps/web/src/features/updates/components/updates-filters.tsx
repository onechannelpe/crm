import type { UpdateFilter } from "~/lib/updates/types";

import styles from "./updates-page.module.css";

type UpdatesFilterOption = {
  label: string;
  value: UpdateFilter;
};

type UpdatesFiltersProps = {
  active: UpdateFilter;
  onChange: (value: UpdateFilter) => void;
  options: readonly UpdatesFilterOption[];
};

export function UpdatesFilters(props: UpdatesFiltersProps) {
  return (
    <nav class={styles.filterBar} aria-label="Update categories">
      {props.options.map((option) => (
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
      ))}
    </nav>
  );
}
