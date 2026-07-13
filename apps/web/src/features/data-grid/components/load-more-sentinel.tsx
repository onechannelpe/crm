import { createEffect, onCleanup } from "solid-js";

import { useDataGrid } from "../context/instance-context";
import type { DataGridLoadMore } from "../model/types";

import styles from "../styles/table.module.css";

export function DataGridLoadMoreSentinel(props: { config: DataGridLoadMore }) {
  const grid = useDataGrid();
  let sentinel: HTMLDivElement | undefined;

  createEffect(() => {
    const root = grid.getScrollWrapper();
    if (!root || !sentinel || !props.config.hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !props.config.loading) {
          void props.config.onLoadMore();
        }
      },
      { root, rootMargin: "400px" },
    );
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={(element) => (sentinel = element)}
      class={styles.loadMoreSentinel}
      aria-hidden="true"
    >
      {props.config.loading ? "Cargando más..." : null}
    </div>
  );
}
