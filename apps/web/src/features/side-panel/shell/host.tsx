import { Show, createSignal, onMount } from "solid-js";

import { useIsMobile } from "~/components/ui/layout/responsive/use-is-mobile";

import { Router } from "../router/router";
import { DesktopSidePanelContent } from "./desktop-content";
import { DesktopSidePanelFrame } from "./desktop-frame";
import { MobileShell } from "./mobile-shell";

/*
  Both surfaces are mounted rather than switched on the viewport: the desktop
  frame is server-rendered and hidden below the mobile breakpoint by CSS, so the
  first paint never depends on a viewport we cannot measure on the server. The
  mobile sheet waits for hydration because it portals to the body.
*/
export function SidePanelHost() {
  const [isHydrated, setIsHydrated] = createSignal(false);
  const isMobile = useIsMobile();

  const isInteractive = () => isHydrated() && !isMobile();

  onMount(() => {
    setIsHydrated(true);
  });

  return (
    <>
      <DesktopSidePanelFrame
        isInteractive={isInteractive()}
        renderContent={() =>
          isInteractive() ? <DesktopSidePanelContent /> : <></>
        }
        shouldRenderChildren={isInteractive()}
      />

      <Show when={isHydrated() && isMobile()}>
        <MobileShell targetVariant="fullScreen">
          <Router isMobile />
        </MobileShell>
      </Show>
    </>
  );
}
