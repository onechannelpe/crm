import { For } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import type { TabId } from "./constants";
import { TAB_ITEMS } from "./constants";

import styles from "../page.module.css";

type TabsProps = {
  activeTab: TabId;
  hiddenTabsCount: number;
  onTabSelect: (tabId: TabId) => void;
};

export function Tabs(props: TabsProps) {
  return (
    <div class={styles.tabs}>
      <For each={TAB_ITEMS}>
        {(tab) => (
          <button
            type="button"
            class={`${styles.tab} ${props.activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => props.onTabSelect(tab.id)}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        )}
      </For>
      <button type="button" class={styles.moreTab}>
        <ChevronDown size={14} />
        <span>+{props.hiddenTabsCount} More</span>
      </button>
    </div>
  );
}
