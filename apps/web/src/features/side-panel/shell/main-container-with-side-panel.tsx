import {
  type ParentProps,
  Show,
  Suspense,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { cn } from "~/lib/utils";

import { SidePanelRouter } from "../router/side-panel-router";
import { ResizeGap } from "./resize-gap";
import { SidePanelMobileShell } from "./side-panel-mobile-shell";
import { SidePanelShell } from "./side-panel-shell";
import { SidePanelWidthEffect } from "./side-panel-width-effect";

import shellStyles from "~/components/layout/shell.module.css";

export function MainContainerWithSidePanel(props: ParentProps) {
  const [isMobile, setIsMobile] = createSignal(false);

  onMount(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  const [isResizing, setIsResizing] = createSignal(false);

  return (
    <div class={cn(shellStyles.panel, shellStyles.panelWithDetail)}>
      <div class={shellStyles.panelMain}>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
      <Show
        when={!isMobile()}
        fallback={
          <SidePanelMobileShell targetVariant="fullScreen">
            <SidePanelRouter />
          </SidePanelMobileShell>
        }
      >
        <SidePanelWidthEffect />
        <ResizeGap
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
        />
        <SidePanelShell isResizing={isResizing()}>
          <SidePanelRouter />
        </SidePanelShell>
      </Show>
    </div>
  );
}
