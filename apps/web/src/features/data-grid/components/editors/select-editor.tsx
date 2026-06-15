import { For, onMount } from "solid-js";

import styles from "../../styles/data-grid.module.css";

export type GridSelectOption<V extends string> = {
  value: V;
  label: string;
};

// Selection is explicit: choosing an option commits, Escape cancels, and outside
// dismissal commits nothing.
export function GridSelectEditor<V extends string>(props: {
  options: readonly GridSelectOption<V>[];
  selected?: V | null;
  onCommit: (value: V) => void;
  close: () => void;
}) {
  let listRef: HTMLDivElement | undefined;

  onMount(() => listRef?.focus());

  return (
    <div
      ref={(el) => (listRef = el)}
      class={styles.cellEditorOptions}
      // Custom styled option list; native select/datalist can't carry the grid styling.
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="listbox"
      tabindex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          props.close();
        }
      }}
    >
      <For each={props.options}>
        {(option) => (
          <button
            type="button"
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="option"
            aria-selected={option.value === props.selected}
            class={styles.cellEditorOption}
            data-active={option.value === props.selected ? "true" : "false"}
            onClick={() => {
              props.onCommit(option.value);
              props.close();
            }}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
