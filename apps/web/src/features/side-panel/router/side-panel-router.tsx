import { Show, onMount } from "solid-js";

import { cn } from "~/lib/utils";

import { SidePanelRecordPage } from "../pages/record/side-panel-record-page";
import { SidePanelRootPage } from "../pages/root/side-panel-root-page";
import { SidePanelSearchResultsPage } from "../pages/search-results/side-panel-search-results-page";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelTopBar } from "../top-bar/side-panel-top-bar";
import { SidePanelContainer } from "./side-panel-container";

import styles from "./side-panel-router.module.css";

export function SidePanelRouter() {
  const { currentPage } = useSidePanel();

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
          <Show when={currentPage()} keyed>
            {(page) => {
              switch (page.type) {
                case "root":
                  return <SidePanelRootPage page={page} />;
                case "search-results":
                  return <SidePanelSearchResultsPage page={page} />;
                case "record":
                  return <SidePanelRecordPage page={page} />;
              }

              page satisfies never;
              throw new Error("Unsupported side panel page type");
            }}
          </Show>
        </div>
      </div>
    </SidePanelContainer>
  );
}
