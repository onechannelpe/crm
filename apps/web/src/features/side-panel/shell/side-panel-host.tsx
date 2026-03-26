import { Show, createSignal, onCleanup, onMount } from "solid-js";

import { SidePanelRouter } from "../router/side-panel-router";
import { ResizeGap } from "./resize-gap";
import { SidePanelMobileShell } from "./side-panel-mobile-shell";
import { SidePanelShell } from "./side-panel-shell";
import { SidePanelWidthEffect } from "./side-panel-width-effect";

function SidePanelSurface(props: { isMobile: boolean }) {
  const [isResizing, setIsResizing] = createSignal(false);

  return (
    <Show
      when={props.isMobile}
      fallback={
        <>
          <SidePanelWidthEffect />
          <ResizeGap
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
          />
          <SidePanelShell isResizing={isResizing()}>
            <SidePanelRouter isMobile={false} />
          </SidePanelShell>
        </>
      }
    >
      <SidePanelMobileShell targetVariant="fullScreen">
        <SidePanelRouter isMobile />
      </SidePanelMobileShell>
    </Show>
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
    <Show when={isHydrated()}>
      <SidePanelSurface isMobile={isMobile()} />
    </Show>
  );
}
