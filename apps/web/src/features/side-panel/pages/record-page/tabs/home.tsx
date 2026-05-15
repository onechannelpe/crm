import { Show, createMemo } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { LeadActionsWidget } from "~/features/workflow/detail/actions/widget";
import { WorkflowStageSections } from "~/features/workflow/detail/sections/workflow-stage-sections";

import { BootstrapWidget } from "../widgets/bootstrap";
import { CreateFieldsWidget, DetailFieldsWidget } from "../widgets/fields";
import { SunatWidget } from "../widgets/sunat";
import { WorkflowWidget } from "../widgets/workflow";
import type { TabContentProps } from "./content-props";

import styles from "./home.module.css";

export function HomeTab(props: TabContentProps) {
  const viewProps = createMemo(() => (props.mode === "view" ? props : null));
  const createProps = createMemo(() =>
    props.mode === "create" ? props : null,
  );

  return (
    <Show
      when={viewProps()}
      keyed
      fallback={
        <Show when={createProps()} keyed>
          {(create) => (
            <div class={styles.homeContent}>
              <CreateContent
                razonSocial={create.razonSocial}
                address={create.address}
                engineStatus={create.engineStatus}
                submitting={create.submitting}
                onSubmit={create.onSubmit}
              />
            </div>
          )}
        </Show>
      }
    >
      {(view) => (
        <div class={styles.homeContent}>
          <DetailContent data={view.data} />
        </div>
      )}
    </Show>
  );
}

function CreateContent(props: {
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  submitting?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <>
      <CreateFieldsWidget
        razonSocial={props.razonSocial}
        address={props.address}
      />
      <BootstrapWidget
        engineStatus={props.engineStatus}
        submitting={props.submitting}
        onSubmit={props.onSubmit}
      />
      <SunatWidget />
    </>
  );
}

function DetailContent(props: { data: LeadDetailView }) {
  return (
    <>
      <WorkflowWidget data={props.data} />
      <DetailFieldsWidget data={props.data} />
      <Show when={props.data.lead.id} keyed>
        {(leadId) => (
          <WorkflowStageSections leadId={leadId} data={props.data} />
        )}
      </Show>
      <SunatWidget data={props.data} />
      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </>
  );
}
