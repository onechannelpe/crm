import { Motion } from "@crm/solid-motion";
import { ErrorBoundary, Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading/screen";

import { HotkeyBoundary } from "../core/hotkeys/hotkey-boundary";
import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { useSidePanel } from "../state/use-side-panel";
import { TopBar } from "../top-bar/top-bar";
import { Container } from "./container";
import { PageInstanceProvider } from "./page-instance-context";

import styles from "./router.module.css";

export function Router(props: { isMobile: boolean }) {
  const { currentEntry } = useSidePanel();

  return (
    <Container isMobile={props.isMobile}>
      <div class={styles.router}>
        <Motion.div
          class={styles.topBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.075, delay: 0.1 }}
        >
          <TopBar isMobile={props.isMobile} />
        </Motion.div>
        <div class={styles.pageBody}>
          <Show when={currentEntry()} keyed>
            {(entry) => {
              const PageComponent =
                SIDE_PANEL_PAGES_CONFIG[entry.page].component;

              return (
                <HotkeyBoundary class={styles.pageContent}>
                  <PageInstanceProvider pageId={entry.pageId}>
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
                  </PageInstanceProvider>
                </HotkeyBoundary>
              );
            }}
          </Show>
        </div>
      </div>
    </Container>
  );
}
