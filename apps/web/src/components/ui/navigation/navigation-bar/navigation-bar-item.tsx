import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { IconProps } from "~/components/icons/icon-base";
import { cn } from "~/shared/classnames";

import styles from "./navigation-bar.module.css";

export type NavigationBarIcon = Component<Omit<IconProps, "name" | "iconNode">>;

export function NavigationBarItem(props: {
  Icon: NavigationBarIcon;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={cn(styles.item, props.isActive && styles.itemActive)}
      onClick={() => props.onClick()}
      aria-label={props.label}
    >
      <Dynamic component={props.Icon} size={20} />
    </button>
  );
}
