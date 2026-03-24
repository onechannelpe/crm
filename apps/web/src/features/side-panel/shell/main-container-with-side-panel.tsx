import { type ParentProps, Show, Suspense, createSignal, onCleanup, onMount } from "solid-js";
import { Loading } from "~/components/feedback/loading";
import shellStyles from "~/components/layout/shell.module.css";
import { cn } from "~/lib/utils";
import { useCommandMenuHotKeys } from "../hooks/use-command-menu-hot-keys";
import { ResizeGap } from "./resize-gap";
import { SidePanelMobileShell } from "./side-panel-mobile-shell";
import { SidePanelShell } from "./side-panel-shell";
import { SidePanelWidthEffect } from "./side-panel-width-effect";

export function MainContainerWithSidePanel(props: ParentProps) {
  useCommandMenuHotKeys();

  const mq = window.matchMedia("(max-width: 768px)");
  const [isMobile, setIsMobile] = createSignal(mq.matches);

  onMount(() => {
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
            {/* SidePanelRouter wired in task 16 */}
          </SidePanelMobileShell>
        }
      >
        <SidePanelWidthEffect />
        <ResizeGap
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
        />
        <SidePanelShell isResizing={isResizing()}>
          {/* SidePanelRouter wired in task 16 */}
        </SidePanelShell>
      </Show>
    </div>
  );
}
