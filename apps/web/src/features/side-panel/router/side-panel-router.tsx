import { Show } from "solid-js";

import { SidePanelPageInstanceProvider } from "../state/side-panel-page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/side-panel-pages-config";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelTopBar } from "../top-bar/side-panel-top-bar";
import { SidePanelContainer } from "./side-panel-container";

import styles from "./side-panel-router.module.css";

export function SidePanelRouter() {
  const { currentEntry } = useSidePanel();

  return (
    <SidePanelContainer>
      <div class={styles.router}>
        <div class={styles.topBar}>
          <SidePanelTopBar />
        </div>
        <div class={styles.pageBody}>
          <Show when={currentEntry()} keyed>
            {(entry) => {
              const PageComponent =
                SIDE_PANEL_PAGES_CONFIG[entry.page].component;

              return (
                <div class={styles.pageContent}>
                  <SidePanelPageInstanceProvider pageId={entry.pageId}>
                    <PageComponent />
                  </SidePanelPageInstanceProvider>
                </div>
              );
            }}
          </Show>
        </div>
      </div>
    </SidePanelContainer>
  );
}
