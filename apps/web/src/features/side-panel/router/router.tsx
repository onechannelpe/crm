import { ErrorBoundary, Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";

import { PageFrameProvider } from "../state/page-frame";
import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { useSidePanel } from "../state/use-side-panel";
import { TopBar } from "../top-bar/top-bar";
import { Container } from "./container";

import styles from "./router.module.css";

export function Router(props: { isMobile: boolean }) {
  const { currentFrame } = useSidePanel();

  return (
    <Container isMobile={props.isMobile}>
      <div class={styles.router}>
        <div class={styles.topBar}>
          <TopBar isMobile={props.isMobile} />
        </div>
        <div class={styles.pageBody}>
          <Show when={currentFrame()} keyed>
            {(frame) => {
              const PageComponent =
                SIDE_PANEL_PAGES_CONFIG[frame.entry.page].component;

              return (
                <div class={styles.pageContent}>
                  <PageFrameProvider frame={frame}>
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
                  </PageFrameProvider>
                </div>
              );
            }}
          </Show>
        </div>
      </div>
    </Container>
  );
}
