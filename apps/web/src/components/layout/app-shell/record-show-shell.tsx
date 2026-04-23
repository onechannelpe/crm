import { useParams, type RouteSectionProps } from "@solidjs/router";

import { RecordShowHeader } from "~/features/record-show/header/record-show-header";
import { RecordShowHeaderActions } from "~/features/record-show/header/record-show-header-actions";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import shellStyles from "~/components/layout/shell.module.css";

export function RecordShowShell(props: RouteSectionProps) {
  const params = useParams<{ recordId: string }>();

  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <RecordShowHeader leadId={params.recordId}>
          <RecordShowHeaderActions leadId={params.recordId} />
        </RecordShowHeader>
        <main class={shellStyles.recordShowBody}>
          <MainContainerWithSidePanel>
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
