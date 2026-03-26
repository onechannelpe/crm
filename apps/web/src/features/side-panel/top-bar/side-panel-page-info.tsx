import { Show } from "solid-js";

import { SidePanelPageInstanceProvider } from "../state/side-panel-page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/side-panel-pages-config";
import { useSidePanel } from "../state/use-side-panel";

export function SidePanelPageInfo() {
  const { currentEntry } = useSidePanel();

  return (
    <Show when={currentEntry()}>
      {(entryValue) => {
        const entry = entryValue();
        const PageInfoComponent =
          SIDE_PANEL_PAGES_CONFIG[entry.page].pageInfoComponent;

        if (!PageInfoComponent) {
          return null;
        }

        return (
          <SidePanelPageInstanceProvider pageId={entry.pageId}>
            <PageInfoComponent />
          </SidePanelPageInstanceProvider>
        );
      }}
    </Show>
  );
}
