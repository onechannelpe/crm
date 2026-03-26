import { type ParentProps, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { cn } from "~/lib/utils";

import { SidePanelHost } from "./side-panel-host";

import shellStyles from "~/components/layout/shell.module.css";

export function MainContainerWithSidePanel(props: ParentProps) {
  return (
    <div class={cn(shellStyles.panel, shellStyles.panelWithDetail)}>
      <div class={shellStyles.panelMain}>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
      <SidePanelHost />
    </div>
  );
}
