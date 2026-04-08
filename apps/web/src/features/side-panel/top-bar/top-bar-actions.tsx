import { Show, type Component } from "solid-js";

import { SIDE_PANEL_PAGES_CONFIG } from "../registry/page-registry";
import { PageFrameProvider } from "../router/page-frame-context";
import { useSidePanel } from "../state/use-side-panel";

export function TopBarActions() {
  const { currentFrame } = useSidePanel();

  return (
    <Show when={currentFrame()} keyed>
      {(frame) => {
        const ActionsComponent = SIDE_PANEL_PAGES_CONFIG[frame.entry.page]
          .topBarActionsComponent as Component | undefined;

        if (!ActionsComponent) {
          return null;
        }

        return (
          <PageFrameProvider frame={frame}>
            <ActionsComponent />
          </PageFrameProvider>
        );
      }}
    </Show>
  );
}
