import { Show, onMount } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "~/lib/utils";

import { SIDE_PANEL_PAGES_CONFIG } from "../config/side-panel-pages-config";
import { SidePanelRootPage } from "../pages/root/side-panel-root-page";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelTopBar } from "../top-bar/side-panel-top-bar";
import { SidePanelContainer } from "./side-panel-container";
import { SidePanelSubPageRouter } from "./side-panel-sub-page-router";

import styles from "./side-panel-router.module.css";

export function SidePanelRouter() {
  const { currentPage } = useSidePanel();

  let topBarRef: HTMLDivElement | undefined;

  onMount(() => {
    if (topBarRef) {
      topBarRef.classList.add(styles.topBarVisible);
    }
  });

  const PageComponent = () => {
    const page = currentPage();
    if (!page) return SidePanelRootPage;
    const component = SIDE_PANEL_PAGES_CONFIG.get(page.key);
    if (!component) {
      if (import.meta.env.DEV) {
        console.warn(
          `SidePanelRouter: no page registered for key "${page.key}", falling back to SidePanelRootPage`,
        );
      }
      return SidePanelRootPage;
    }
    return component;
  };

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
            {(page) => (
              <SidePanelSubPageRouter pageInstanceId={page.instanceId}>
                <Dynamic component={PageComponent()} />
              </SidePanelSubPageRouter>
            )}
          </Show>
        </div>
      </div>
    </SidePanelContainer>
  );
}
