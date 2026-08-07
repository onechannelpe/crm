import { useParams, type RouteSectionProps } from "@solidjs/router";

import { RecordShowHeader } from "~/features/record-show/header/record-show-header";
import { RecordShowHeaderActions } from "~/features/record-show/header/record-show-header-actions";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import { RecordShowShellSkeleton } from "./skeletons/record-show-shell-skeleton";

import shellStyles from "~/components/layout/shell.module.css";

export function RecordShowShell(props: RouteSectionProps) {
  const params = useParams<{ recordId: string }>();

  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <main class={shellStyles.fixedBody}>
          <MainContainerWithSidePanel
            header={
              <RecordShowHeader leadId={params.recordId}>
                <RecordShowHeaderActions leadId={params.recordId} />
              </RecordShowHeader>
            }
            fallback={<RecordShowShellSkeleton />}
          >
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
