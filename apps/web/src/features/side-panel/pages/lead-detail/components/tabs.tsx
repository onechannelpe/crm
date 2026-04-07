import { For, Show, createSignal, onCleanup, onMount } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";

import styles from "../page.module.css";

type TabsProps = {
  activeTab: ExtendedTabId;
  hiddenTabsCount: number;
  onTabSelect: (tabId: TabId) => void;
  onHiddenTabSelect: (tabId: ExtendedTabId) => void;
};

export function Tabs(props: TabsProps) {
  const [isOverflowOpen, setIsOverflowOpen] = createSignal(false);
  let overflowWrapRef: HTMLDivElement | undefined;

  onMount(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!isOverflowOpen()) return;

      const target = event.target;
      if (!(target instanceof Node) || !overflowWrapRef) return;

      if (overflowWrapRef.contains(target)) return;

      setIsOverflowOpen(false);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handleDocumentPointerDown),
    );
  });

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
      <div class={styles.moreTabWrap} ref={(el) => (overflowWrapRef = el)}>
        <button
          type="button"
          class={styles.moreTab}
          onClick={() => setIsOverflowOpen((value) => !value)}
        >
          <ChevronDown size={14} />
          <span>+{props.hiddenTabsCount} More</span>
        </button>
        <Show when={isOverflowOpen()}>
          <div class={styles.moreMenu}>
            <For each={HIDDEN_TAB_ITEMS}>
              {(tab) => (
                <button
                  type="button"
                  class={styles.moreMenuItem}
                  onClick={() => {
                    props.onHiddenTabSelect(tab.id);
                    setIsOverflowOpen(false);
                  }}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
