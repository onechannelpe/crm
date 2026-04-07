import { Show, type Component } from "solid-js";

import { PageInstanceProvider } from "../state/page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/pages-config";
import { useSidePanel } from "../state/use-side-panel";

export function TopBarActions() {
  const { currentEntry } = useSidePanel();

  return (
    <Show when={currentEntry()}>
      {(entryValue) => {
        const entry = entryValue();
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
