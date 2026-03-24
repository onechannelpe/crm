import { Show, onMount } from "solid-js";

import { cn } from "~/lib/utils";

import { SidePanelPageInstanceProvider } from "../state/side-panel-page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/side-panel-pages-config";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelTopBar } from "../top-bar/side-panel-top-bar";
import { SidePanelContainer } from "./side-panel-container";

import styles from "./side-panel-router.module.css";

export function SidePanelRouter() {
  const { currentEntry } = useSidePanel();

  let topBarRef: HTMLDivElement | undefined;

  onMount(() => {
    if (topBarRef) {
      topBarRef.classList.add(styles.topBarVisible);
    }
  });

  return (
    <SidePanelContainer>
      <div class={styles.router}>
        <div
          ref={(el) => {
            topBarRef = el;
          }}
          class={cn(styles.topBar)}
        >
          <SidePanelTopBar />
        </div>
        <div class={styles.pageBody}>
          <Show when={currentEntry()} keyed>
            {(entry) => {
              const PageComponent = SIDE_PANEL_PAGES_CONFIG[entry.page].component;

              return (
                <SidePanelPageInstanceProvider pageId={entry.pageId}>
                  <PageComponent />
                </SidePanelPageInstanceProvider>
              );
            }}
          </Show>
        </div>
      </div>
    </SidePanelContainer>
  );
}
