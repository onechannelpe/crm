import { For } from "solid-js";

import {
  NavigationBarItem,
  type NavigationBarIcon,
} from "./navigation-bar-item";

import styles from "./navigation-bar.module.css";

export type NavigationBarItemDef = {
  name: string;
  label: string;
  Icon: NavigationBarIcon;
  onClick: () => void;
};

export function NavigationBar(props: {
  activeItemName: string;
  items: NavigationBarItemDef[];
}) {
  return (
    <nav class={styles.container}>
      <For each={props.items}>
        {(item) => (
          <NavigationBarItem
            Icon={item.Icon}
            label={item.label}
            isActive={props.activeItemName === item.name}
            onClick={item.onClick}
          />
        )}
      </For>
    </nav>
  );
}
