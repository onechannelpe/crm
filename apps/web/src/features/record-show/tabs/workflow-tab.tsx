import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { SetupWorkspace } from "~/features/record-show/setup/setup-workspace";
import { LeadActionsWidget } from "~/features/workflow/detail/actions/widget";
import { WorkflowStageSections } from "~/features/workflow/detail/sections/workflow-stage-sections";

export function WorkflowTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => (
        <>
          <WorkflowStageSections leadId={data.lead.id} data={data} />
          <Show
            when={
              data.lead.stage === "SETUP_PLAN" ||
              data.lead.stage === "SETUP_EXECUTION" ||
              data.lead.stage === "LIVE"
            }
          >
            <SetupWorkspace data={data} />
          </Show>
          <LeadActionsWidget
            leadId={data.lead.id}
            availableActions={data.availableActions}
          />
        </>
      )}
    </Show>
  );
}
