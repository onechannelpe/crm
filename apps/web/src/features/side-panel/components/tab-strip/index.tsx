import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { createStore } from "solid-js/store";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";

import styles from "./styles.module.css";

// Matches Twenty's TAB_LIST_GAP = 4
const TAB_GAP = 4;

export type TabIconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  icon?: TabIconComponent;
};

type TabStripProps<TId extends string> = {
  tabs: ReadonlyArray<TabItem<TId>>;
  activeTab: TId;
  onTabSelect: (id: TId) => void;
};

export function TabStrip<TId extends string>(props: TabStripProps<TId>) {
  const [tabWidths, setTabWidths] = createStore<Record<string, number | undefined>>({});
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [moreButtonWidth, setMoreButtonWidth] = createSignal(0);
  const [isOverflowOpen, setIsOverflowOpen] = createSignal(false);

  let containerRef: HTMLDivElement | undefined;
  let moreButtonMeasureRef: HTMLDivElement | undefined;
  let overflowWrapRef: HTMLDivElement | undefined;

  // Mirrors Twenty's calculateVisibleTabCount (without TAB_LIST_LEFT_PADDING
  // since we have no internal left padding on the container)
  const visibleTabCount = createMemo(() => {
    const widths = tabWidths;
    const cw = containerWidth();
    const mbw = moreButtonWidth();
    const allTabs = props.tabs;

    if (cw === 0) {
      return allTabs.length;
    }

    let total = 0;
    for (let i = 0; i < allTabs.length; i++) {
      const tab = allTabs[i];
      const w = widths[tab.id];
      if (w === undefined) return allTabs.length;
      const gap = i > 0 ? TAB_GAP : 0;
      const moreNeeded = i < allTabs.length - 1 ? mbw + TAB_GAP : 0;
      total += w + gap;
      if (total + moreNeeded > cw) return Math.max(1, i);
    }
    return allTabs.length;
  });

  const hiddenTabs = createMemo(() => props.tabs.slice(visibleTabCount()));

  createResizeObserver(
    () => containerRef,
    ({ width }) => setContainerWidth(width),
  );
  createResizeObserver(
    () => moreButtonMeasureRef,
    ({ width }) => setMoreButtonWidth(width),
  );

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
    <div
      class={styles.tabs}
      ref={(el) => {
        containerRef = el;
      }}
    >
      {/* Off-screen: render all tabs to measure their natural widths */}
      <div class={styles.hiddenMeasure}>
        <For each={props.tabs}>
          {(tab) => {
            const [el, setEl] = createSignal<HTMLDivElement>();
            createResizeObserver(el, ({ width }) => setTabWidths(tab.id, width));

            onCleanup(() => setTabWidths(tab.id, undefined));

            const Icon = tab.icon;
            return (
              <div ref={setEl} class={styles.tab}>
                <span class={styles.tabContent}>
                  {Icon && <Icon size={16} />}
                  <span>{tab.label}</span>
                </span>
              </div>
            );
          }}
        </For>
        <div
          ref={(el) => (moreButtonMeasureRef = el)}
          class={styles.moreTab}
        >
          <span class={styles.moreTabContent}>
            <span>+99 más</span>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>

      <div class={styles.tabContainer}>
        <For each={props.tabs.slice(0, visibleTabCount())}>
          {(tab) => {
            const Icon = tab.icon;
            return (
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
                  {Icon && <Icon size={16} />}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          }}
        </For>
      </div>

      <Show when={hiddenTabs().length > 0}>
        <div class={styles.moreTabWrap} ref={(el) => (overflowWrapRef = el)}>
          <button
            type="button"
            data-testid="tab-tab-more-button"
            classList={{
              [styles.moreTab]: true,
              [styles.tabActive]: hiddenTabs().some(
                (tab) => tab.id === props.activeTab,
              ),
            }}
            onClick={() => setIsOverflowOpen((v) => !v)}
          >
            <span class={styles.moreTabContent}>
              <span>+{hiddenTabs().length} más</span>
              <ChevronDown size={16} />
            </span>
          </button>
          <Show when={isOverflowOpen()}>
            <div class={styles.moreMenu}>
              <For each={hiddenTabs()}>
                {(tab) => (
                  <button
                    type="button"
                    classList={{
                      [styles.moreMenuItem]: true,
                      [styles.moreMenuItemActive]: tab.id === props.activeTab,
                    }}
                    onClick={() => {
                      props.onTabSelect(tab.id);
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
