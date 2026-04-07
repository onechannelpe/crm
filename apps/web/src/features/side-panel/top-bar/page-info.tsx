import { Show } from "solid-js";

import { PageInstanceProvider } from "../state/page-instance";
import { SIDE_PANEL_PAGES_CONFIG } from "../state/pages-config";
import { useSidePanel } from "../state/use-side-panel";

export function PageInfo() {
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
          <PageInstanceProvider pageId={entry.pageId}>
            <PageInfoComponent />
          </PageInstanceProvider>
        );
      }}
    </Show>
  );
}
