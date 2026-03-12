import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./filter-bar.module.css";

interface FilterBarProps {
  children: JSX.Element;
  class?: string;
}

export function FilterBar(props: FilterBarProps) {
  return <div class={cn(styles.filterBar, props.class)}>{props.children}</div>;
}
