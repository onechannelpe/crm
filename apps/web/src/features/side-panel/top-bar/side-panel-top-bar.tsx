import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Dynamic } from "solid-js/web";

import X from "~/components/icons/x";
import { cn } from "~/lib/utils";

import { useSidePanelContextChips } from "../hooks/use-side-panel-context-chips";
import { SIDE_PANEL_PAGE_METADATA } from "../state/side-panel-page-metadata";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelBackButton } from "./side-panel-back-button";
import { SidePanelPageInfo } from "./side-panel-page-info";

import styles from "./side-panel-top-bar.module.css";

export function SidePanelTopBar() {
  const {
    navigationStack,
    currentPage,
    closePanel,
    searchText,
    setSearchText,
  } = useSidePanel();
  const chips = useSidePanelContextChips();

  const [isMobile, setIsMobile] = createSignal(false);

  onMount(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  const showBackButton = () => navigationStack().length > 1;
  const showCloseButton = () => navigationStack().length === 1 && !isMobile();
  const showSearch = () => {
    const page = currentPage();
    if (!page) return false;
    return SIDE_PANEL_PAGE_METADATA[page.type].showsSearch;
  };

  return (
    <div class={cn(styles.topBar, isMobile() && styles.topBarMobile)}>
      <div class={styles.leftControls}>
        <SidePanelBackButton visible={showBackButton()} />
        <Show when={showCloseButton()}>
          <button
            type="button"
            class={styles.closeButton}
            onClick={closePanel}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </Show>
      </div>

      <div class={styles.rightSlot}>
        <Show when={showSearch()} fallback={<SidePanelPageInfo />}>
          <input
            type="text"
            class={styles.searchInput}
            placeholder="Buscar o escribir un comando..."
            value={searchText()}
            onInput={(e) => setSearchText(e.currentTarget.value)}
          />
        </Show>
        <For each={chips()}>
          {(chip) => (
            <Show
              when={chip.onClick}
              fallback={
                <span class={cn(styles.chip, styles.chipStatic)}>
                  <Dynamic component={chip.page.icon} size={12} />
                  {chip.page.title}
                </span>
              }
            >
              <button type="button" class={styles.chip} onClick={chip.onClick}>
                <Dynamic component={chip.page.icon} size={12} />
                {chip.page.title}
              </button>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
