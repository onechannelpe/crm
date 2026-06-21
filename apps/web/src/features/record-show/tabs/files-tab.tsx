import { Show, createMemo } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { FilesCard } from "~/features/record-show/tabs/files/files-card";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

export function FilesTab(props: { context: RecordContext }) {
  const lead = createMemo(() =>
    props.context.kind === "lead" ? props.context.data : null,
  );

  return (
    <Show
      when={lead()}
      keyed
      fallback={
        <ActivityTabContainer>
          <ActivityTabEmptyState
            type="noFile"
            title="Sin archivos"
            subtitle="Los comprobantes se habilitan cuando la venta está convertida."
          />
        </ActivityTabContainer>
      }
    >
      {(data) => (
        <FilesCard
          leadId={data.lead.id}
          canUpload={data.lead.stage === "LIVE"}
          rateRevisions={data.rateRevisions}
        />
      )}
    </Show>
  );
}
