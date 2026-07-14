import { createResizeObserver } from "@solid-primitives/resize-observer";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";

import ChevronDown from "~/components/icons/chevron-down";
import {
  TabButton,
  TabMeasure,
} from "~/features/side-panel/components/tab-button";
import type { TabIconComponent } from "~/features/side-panel/components/tab-strip/types";

import styles from "./styles.module.css";
export type { TabIconComponent } from "./types";

const TAB_GAP = 4;

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  icon?: TabIconComponent;
};

type TabStripProps<TId extends string> = {
  tabs: ReadonlyArray<TabItem<TId>>;
  activeTab: TId;
  onTabSelect: (id: TId) => void;
  // Right-aligned slot, mirroring Twenty's TabList rightComponent. Page-level
  // actions belong here rather than in a filter bar, where they read as filters.
  rightComponent?: JSX.Element;
};

export function TabStrip<TId extends string>(props: TabStripProps<TId>) {
  const [tabWidths, setTabWidths] = createStore<
    Record<string, number | undefined>
  >({});
  const [containerWidth, setContainerWidth] = createSignal(0);
  const [moreButtonWidth, setMoreButtonWidth] = createSignal(0);
  const [isOverflowOpen, setIsOverflowOpen] = createSignal(false);

  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [moreButtonMeasureRef, setMoreButtonMeasureRef] =
    createSignal<HTMLDivElement>();
  const [overflowWrapRef, setOverflowWrapRef] = createSignal<HTMLDivElement>();

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
  const hasHiddenTabs = createMemo(() => hiddenTabs().length > 0);
  const hiddenTabCount = createMemo(() => hiddenTabs().length);
  const isActiveTabHidden = createMemo(() =>
    hiddenTabs().some((tab) => tab.id === props.activeTab),
  );

  createResizeObserver(containerRef, ({ width }) => setContainerWidth(width));
  createResizeObserver(moreButtonMeasureRef, ({ width }) =>
    setMoreButtonWidth(width),
  );

  createEffect(() => {
    if (!hasHiddenTabs() && isOverflowOpen()) {
      setIsOverflowOpen(false);
    }
  });

  onMount(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!isOverflowOpen()) return;
      const target = event.target;
      const wrap = overflowWrapRef();
      if (!(target instanceof Node) || !wrap) return;
      if (wrap.contains(target)) return;
      setIsOverflowOpen(false);
    };
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handleDocumentPointerDown),
    );
  });

  return (
    <div class={styles.tabs} ref={setContainerRef}>
      {/* Hidden measurement row gives ResizeObserver each tab's natural width. */}
      <div class={styles.hiddenMeasure}>
        <For each={props.tabs}>
          {(tab) => {
            const [el, setEl] = createSignal<HTMLDivElement>();
            createResizeObserver(el, ({ width }) =>
              setTabWidths(tab.id, width),
            );

            onCleanup(() => setTabWidths(tab.id, undefined));

            return <TabMeasure ref={setEl} icon={tab.icon} title={tab.label} />;
          }}
        </For>
        <div ref={setMoreButtonMeasureRef} class={styles.moreTab}>
          <span class={styles.moreTabContent}>
            <span>+99 más</span>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>

      <div class={styles.tabContainer}>
        <For each={props.tabs.slice(0, visibleTabCount())}>
          {(tab) => {
            return (
              <TabButton
                dataTestId={`tab-${tab.id}`}
                icon={tab.icon}
                title={tab.label}
                active={props.activeTab === tab.id}
                onClick={() => props.onTabSelect(tab.id)}
              />
            );
          }}
        </For>
      </div>

      <Show when={hasHiddenTabs()}>
        <div class={styles.moreTabWrap} ref={setOverflowWrapRef}>
          <button
            type="button"
            data-testid="tab-tab-more-button"
            classList={{
              [styles.moreTab]: true,
              [styles.moreTabActive]: isActiveTabHidden(),
            }}
            onClick={() => setIsOverflowOpen((v) => !v)}
          >
            <span class={styles.moreTabContent}>
              <span>+{hiddenTabCount()} más</span>
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

      <Show when={props.rightComponent}>
        {(right) => <div class={styles.rightSlot}>{right()}</div>}
      </Show>
    </div>
  );
}
