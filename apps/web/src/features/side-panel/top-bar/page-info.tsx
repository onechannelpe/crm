import { Show } from "solid-js";

import { PageFrameProvider } from "../state/page-frame";
import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { useSidePanel } from "../state/use-side-panel";

export function PageInfo() {
  const { currentFrame } = useSidePanel();

  return (
    <Show when={currentFrame()} keyed>
      {(frame) => {
        const PageInfoComponent =
          SIDE_PANEL_PAGES_CONFIG[frame.entry.page].pageInfoComponent;

        if (!PageInfoComponent) {
          return null;
        }

        return (
          <PageFrameProvider frame={frame}>
            <PageInfoComponent />
          </PageFrameProvider>
        );
      }}
    </Show>
  );
}
