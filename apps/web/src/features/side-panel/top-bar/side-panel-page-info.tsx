import { Show } from "solid-js/web";

import { SidePanelRecordPageInfo } from "../pages/record/side-panel-record-page-info";
import { useSidePanel } from "../state/use-side-panel";

export function SidePanelPageInfo() {
  const { currentPage } = useSidePanel();

  return (
    <Show when={currentPage()}>
      {(currentPageValue) => {
        const page = currentPageValue();

        switch (page.type) {
          case "root":
          case "search-results":
            return null;
          case "record":
            return <SidePanelRecordPageInfo page={page} />;
        }

        page satisfies never;
        return null;
      }}
    </Show>
  );
}
