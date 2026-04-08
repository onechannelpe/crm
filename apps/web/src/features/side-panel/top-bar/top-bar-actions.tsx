import { Show, type Component } from "solid-js";

import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { PageInstanceProvider } from "../router/page-instance-context";
import { useSidePanel } from "../state/use-side-panel";

export function TopBarActions() {
  const { currentEntry } = useSidePanel();

  return (
    <Show when={currentEntry()} keyed>
      {(entry) => {
        const ActionsComponent = SIDE_PANEL_PAGES_CONFIG[entry.page]
          .topBarActionsComponent as Component | undefined;

        if (!ActionsComponent) {
          return null;
        }

        return (
          <PageInstanceProvider pageId={entry.pageId}>
            <ActionsComponent />
          </PageInstanceProvider>
        );
      }}
    </Show>
  );
}
