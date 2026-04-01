import { ErrorBoundary, Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";

import { SidePanelPageInstanceProvider } from "../state/side-panel-page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/side-panel-pages-config";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelTopBar } from "../top-bar/side-panel-top-bar";
import { SidePanelContainer } from "./side-panel-container";

import styles from "./side-panel-router.module.css";

export function SidePanelRouter(props: { isMobile: boolean }) {
  const { currentEntry } = useSidePanel();

  return (
    <SidePanelContainer isMobile={props.isMobile}>
      <div class={styles.router}>
        <div class={styles.topBar}>
          <SidePanelTopBar isMobile={props.isMobile} />
        </div>
        <div class={styles.pageBody}>
          <Show when={currentEntry()} keyed>
            {(entry) => {
              const PageComponent =
                SIDE_PANEL_PAGES_CONFIG[entry.page].component;

              return (
                <div class={styles.pageContent}>
                  <SidePanelPageInstanceProvider pageId={entry.pageId}>
                    <ErrorBoundary
                      fallback={
                        <div class={styles.pageState}>
                          No se pudo cargar el panel.
                        </div>
                      }
                    >
                      <Suspense
                        fallback={
                          <div class={styles.pageState}>
                            <Loading size="sm" />
                          </div>
                        }
                      >
                        <PageComponent />
                      </Suspense>
                    </ErrorBoundary>
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
