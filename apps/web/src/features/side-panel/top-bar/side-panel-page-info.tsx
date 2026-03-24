import { Dynamic, Show } from "solid-js";

import { useSidePanel } from "../state/use-side-panel";
import { SidePanelPageInfoLayout } from "./side-panel-page-info-layout";

export function SidePanelPageInfo() {
  const { currentPage, pageInfo } = useSidePanel();

  return (
    <Show when={currentPage()}>
      {(page) => (
        <SidePanelPageInfoLayout
          icon={<Dynamic component={page().icon} size={14} />}
          title={page().title}
          label={pageInfo()?.label}
        />
      )}
    </Show>
  );
}
