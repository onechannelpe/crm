import { Show, createSignal, onMount } from "solid-js";

import { useIsMobile } from "~/components/ui/layout/responsive/use-is-mobile";

import { Router } from "../router/router";
import { DesktopSidePanelContent } from "./desktop-content";
import { DesktopSidePanelFrame } from "./desktop-frame";
import { MobileShell } from "./mobile-shell";

function SidePanelDesktopController(props: {
  isHydrated: boolean;
  isMobile: boolean;
}) {
  const isInteractive = () => props.isHydrated && !props.isMobile;
  const renderDesktopContent = () =>
    isInteractive() ? <DesktopSidePanelContent /> : <></>;

  return (
    <>
      <DesktopSidePanelFrame
        isInteractive={isInteractive()}
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
  const isMobile = useIsMobile();

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
