import { Show, createSignal, onMount } from "solid-js";

import { useMobileBreakpoint } from "~/components/ui/layout/resizable-panel/use-mobile-breakpoint";
import { useResizablePanel } from "~/components/ui/layout/resizable-panel/use-resizable-panel";

import { Router } from "../router/router";
import {
  SIDE_PANEL_WIDTH_CONSTRAINTS,
  SIDE_PANEL_WIDTH_VAR,
} from "../state/side-panel-width";
import { useSidePanel } from "../state/use-side-panel";
import { DesktopSidePanelContent } from "./desktop-content";
import { DesktopSidePanelFrame } from "./desktop-frame";
import { MobileShell } from "./mobile-shell";

function SidePanelDesktopController(props: {
  isHydrated: boolean;
  isMobile: boolean;
}) {
  const { closePanel, panelWidth, setPanelWidth } = useSidePanel();
  const [isResizing, setIsResizing] = createSignal(false);
  const { onPointerDown } = useResizablePanel({
    side: "left",
    constraints: SIDE_PANEL_WIDTH_CONSTRAINTS,
    getCurrentWidth: panelWidth,
    onWidthChange: (width) => {
      setPanelWidth(width);
    },
    onCollapse: closePanel,
    onResizeStart: () => setIsResizing(true),
    onResizeEnd: () => setIsResizing(false),
    cssVariableName: SIDE_PANEL_WIDTH_VAR,
    dragThresholdPx: 4,
  });

  const isInteractive = () => props.isHydrated && !props.isMobile;
  const renderDesktopContent = () =>
    isInteractive() ? <DesktopSidePanelContent /> : <></>;

  return (
    <>
      <DesktopSidePanelFrame
        gapPointerDown={isInteractive() ? onPointerDown : undefined}
        isInteractive={isInteractive()}
        isResizing={isResizing()}
        renderContent={renderDesktopContent}
        shouldRenderChildren={isInteractive()}
      />
      <Show when={props.isHydrated && props.isMobile}>
        <MobileShell targetVariant="fullScreen">
          <Router isMobile />
        </MobileShell>
      </Show>
    </>
  );
}

export function Host() {
  const [isHydrated, setIsHydrated] = createSignal(false);
  const isMobile = useMobileBreakpoint();

  onMount(() => {
    setIsHydrated(true);
  });

  return (
    <SidePanelDesktopController
      isHydrated={isHydrated()}
      isMobile={isMobile()}
    />
  );
}
