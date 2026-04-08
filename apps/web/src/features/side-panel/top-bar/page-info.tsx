import { Show } from "solid-js";

import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { PageInstanceProvider } from "../router/page-instance-context";
import { useSidePanel } from "../state/use-side-panel";

export function PageInfo() {
  const { currentEntry } = useSidePanel();

  return (
    <Show when={currentEntry()} keyed>
      {(entry) => {
        const PageInfoComponent =
          SIDE_PANEL_PAGES_CONFIG[entry.page].pageInfoComponent;

        if (!PageInfoComponent) {
          return null;
        }

        return (
          <PageInstanceProvider pageId={entry.pageId}>
            <PageInfoComponent />
          </PageInstanceProvider>
        );
      }}
    </Show>
  );
}
