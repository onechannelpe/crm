import { Show } from "solid-js";

import X from "~/components/icons/x";
import { cn } from "~/lib/utils";

import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { useSidePanel } from "../state/use-side-panel";
import { BackButton } from "./back-button";
import { PageInfo } from "./page-info";
import { TopBarActions } from "./top-bar-actions";

import styles from "./top-bar.module.css";

export function TopBar(props: { isMobile: boolean }) {
  const {
    navigationStack,
    currentEntry,
    closePanel,
    searchText,
    setSearchText,
  } = useSidePanel();

  const showBackButton = () => navigationStack().length > 1;
  const showCloseButton = () => !(props.isMobile && showBackButton());
  const showSearch = () => {
    const entry = currentEntry();
    if (!entry) return false;

    return SIDE_PANEL_PAGES_CONFIG[entry.page].showsSearch;
  };

  return (
    <div class={cn(styles.topBar, props.isMobile && styles.topBarMobile)}>
      <div class={styles.content}>
        <div class={styles.leftControls}>
          <BackButton visible={showBackButton()} />
        </div>

        <div class={styles.rightSlot}>
          <Show when={showSearch()} fallback={<PageInfo />}>
            <input
              type="text"
              class={styles.searchInput}
              placeholder="Buscar o escribir un comando..."
              value={searchText()}
              onInput={(e) => setSearchText(e.currentTarget.value)}
            />
          </Show>
        </div>
      </div>
      <div class={styles.rightControls}>
        <TopBarActions />
        <Show when={showCloseButton()}>
          <button
            type="button"
            class={styles.closeButton}
            onClick={closePanel}
            aria-label="Cerrar panel"
          >
            <X size={16} />
          </button>
        </Show>
      </div>
    </div>
  );
}
