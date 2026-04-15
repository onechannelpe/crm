import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import styles from "./styles.module.css";

export type TabIconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  icon: TabIconComponent;
};

export type HiddenTabItem<TId extends string = string> = {
  id: TId;
  label: string;
};

type TabStripProps<TAll extends string, TPrimary extends TAll> = {
  tabs: ReadonlyArray<TabItem<TPrimary>>;
  hiddenTabs: ReadonlyArray<HiddenTabItem<Exclude<TAll, TPrimary>>>;
  activeTab: TAll;
  onTabSelect: (id: TPrimary) => void;
  onHiddenTabSelect: (id: TAll) => void;
};

export function TabStrip<TAll extends string, TPrimary extends TAll>(
  props: TabStripProps<TAll, TPrimary>,
) {
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
      <div class={styles.tabContainer}>
        <For each={props.tabs}>
          {(tab) => (
            <button
              type="button"
              data-testid={`tab-${tab.id}`}
              classList={{
                [styles.tab]: true,
                [styles.tabActive]: props.activeTab === tab.id,
              }}
              onClick={() => props.onTabSelect(tab.id)}
            >
              <span class={styles.tabContent}>
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </span>
            </button>
          )}
        </For>
      </div>

      <Show when={props.hiddenTabs.length > 0}>
        <div class={styles.moreTabWrap} ref={(el) => (overflowWrapRef = el)}>
          <button
            type="button"
            data-testid="tab-tab-more-button"
            classList={{
              [styles.moreTab]: true,
              [styles.tabActive]: props.hiddenTabs.some(
                (tab) => tab.id === props.activeTab,
              ),
            }}
            onClick={() => setIsOverflowOpen((v) => !v)}
          >
            <span class={styles.moreTabContent}>
              <span>+{props.hiddenTabs.length} More</span>
              <ChevronDown size={16} />
            </span>
          </button>
          <Show when={isOverflowOpen()}>
            <div class={styles.moreMenu}>
              <For each={props.hiddenTabs}>
                {(tab) => (
                  <button
                    type="button"
                    classList={{
                      [styles.moreMenuItem]: true,
                      [styles.moreMenuItemActive]: tab.id === props.activeTab,
                    }}
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
      </Show>
    </div>
  );
}
