import { createMemo, For, Show, type JSX } from "solid-js";

import styles from "./contacts-search-layout.module.css";

const PILL_PAGE_SIZE = 3;

interface CollapsedPillListProps<T> {
  items: readonly T[];
  maxVisible?: number;
  class?: string;
  onMoreClick?: () => void;
  renderItem: (item: T) => JSX.Element;
}

export function CollapsedPillList<T>(props: CollapsedPillListProps<T>) {
  const visibleItems = createMemo(() =>
    props.items.slice(0, props.maxVisible ?? PILL_PAGE_SIZE),
  );
  const hiddenCount = createMemo(() =>
    Math.max(0, props.items.length - visibleItems().length),
  );

  return (
    <div class={`${styles.pillWrap}${props.class ? ` ${props.class}` : ""}`}>
      <Show
        when={props.items.length > 0}
        fallback={<span class={styles.pill}>—</span>}
      >
        <For each={visibleItems()}>{(item) => props.renderItem(item)}</For>
      </Show>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class={`${styles.pill} ${styles.pillButton}`}
          onClick={(event) => {
            event.stopPropagation();
            props.onMoreClick?.();
          }}
        >
          +{hiddenCount()} more
        </button>
      </Show>
    </div>
  );
}
