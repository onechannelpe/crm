import {
  type ParentProps,
  Suspense,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { createDiagnostics } from "~/lib/observability/diagnostics";
import { cn } from "~/lib/utils";

import { SidePanelRouter } from "../router/side-panel-router";
import { ResizeGap } from "./resize-gap";
import { SidePanelMobileShell } from "./side-panel-mobile-shell";
import { SidePanelShell } from "./side-panel-shell";
import { SidePanelWidthEffect } from "./side-panel-width-effect";

import shellStyles from "~/components/layout/shell.module.css";

const diagnostics = createDiagnostics("main-container-with-side-panel");

export function MainContainerWithSidePanel(props: ParentProps) {
  const [isHydrated, setIsHydrated] = createSignal(false);
  const [isMobileViewport, setIsMobileViewport] = createSignal(false);

  diagnostics.trace("ssr", "render", {
    hydrated: isHydrated(),
    isMobileViewport: isMobileViewport(),
  });

  onMount(() => {
    diagnostics.trace("hydration", "mounted");
    setIsHydrated(true);

    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobileViewport(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  const [isResizing, setIsResizing] = createSignal(false);
  const useMobileShell = createMemo(() => isHydrated() && isMobileViewport());

  return (
    <div class={cn(shellStyles.panel, shellStyles.panelWithDetail)}>
      <div class={shellStyles.panelMain}>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
      {!useMobileShell() ? (
        <>
          <SidePanelWidthEffect />
          <ResizeGap
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
          />
          <SidePanelShell isResizing={isResizing()}>
            <SidePanelRouter />
          </SidePanelShell>
        </>
      ) : (
        <SidePanelMobileShell targetVariant="fullScreen">
          <SidePanelRouter />
        </SidePanelMobileShell>
      )}
    </div>
  );
}
