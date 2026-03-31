import { Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";

import { useResizablePanel } from "../hooks/use-resizable-panel";
import { SidePanelRouter } from "../router/side-panel-router";
import { useSidePanel } from "../state/use-side-panel";
import { DesktopSidePanelContent } from "./desktop-content";
import { DesktopSidePanelFrame } from "./desktop-frame";
import { SidePanelMobileShell } from "./side-panel-mobile-shell";

function SidePanelDesktopController(props: {
  isHydrated: boolean;
  isMobile: boolean;
}) {
  const { closePanel, panelWidth, setPanelWidth } = useSidePanel();
  const [isResizing, setIsResizing] = createSignal(false);
  const [gapPointerDown, setGapPointerDown] =
    createSignal<JSX.EventHandlerUnion<HTMLDivElement, PointerEvent>>();

  onMount(() => {
    const { onPointerDown } = useResizablePanel({
      get currentWidth() {
        return panelWidth();
      },
      onWidthChange: (width) => {
        setIsResizing(false);
        setPanelWidth(width);
      },
      onCollapse: () => {
        setIsResizing(false);
        closePanel();
      },
      onResizeStart: () => setIsResizing(true),
    });

    setGapPointerDown(() => onPointerDown);
  });

  const isInteractive = () => props.isHydrated && !props.isMobile;
  const renderDesktopContent = () =>
    isInteractive() ? <DesktopSidePanelContent /> : <></>;

  return (
    <>
      <DesktopSidePanelFrame
        gapPointerDown={isInteractive() ? gapPointerDown() : undefined}
        isInteractive={isInteractive()}
        isResizing={isResizing()}
        renderContent={renderDesktopContent}
        shouldRenderChildren={isInteractive()}
      />
      <Show when={props.isHydrated && props.isMobile}>
        <SidePanelMobileShell targetVariant="fullScreen">
          <SidePanelRouter isMobile />
        </SidePanelMobileShell>
      </Show>
    </>
  );
}

export function SidePanelHost() {
  const [isHydrated, setIsHydrated] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);

  onMount(() => {
    setIsHydrated(true);

    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);

    const handleChange = (event: MediaQueryListEvent) =>
      setIsMobile(event.matches);

    mq.addEventListener("change", handleChange);
    onCleanup(() => mq.removeEventListener("change", handleChange));
  });

  return (
    <SidePanelDesktopController
      isHydrated={isHydrated()}
      isMobile={isMobile()}
    />
  );
}
