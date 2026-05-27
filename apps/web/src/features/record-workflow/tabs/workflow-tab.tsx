import { Show } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { LeadActionsWidget } from "~/features/workflow/detail/actions/widget";
import { WorkflowStageSections } from "~/features/workflow/detail/sections/workflow-stage-sections";
import { SetupWorkspace } from "../sections/setup-workspace";

type WorkflowTabProps = {
  data: LeadDetailView;
};

export function WorkflowTab(props: WorkflowTabProps) {
  return (
    <>
      <WorkflowStageSections leadId={props.data.lead.id} data={props.data} />
      <Show
        when={
          props.data.lead.stage === "SETUP_PLAN" ||
          props.data.lead.stage === "SETUP_EXECUTION"
        }
      >
        <SetupWorkspace data={props.data} />
      </Show>
      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </>
  );
}
