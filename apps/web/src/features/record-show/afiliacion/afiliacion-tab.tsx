import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { SetupWorkspace } from "~/features/record-show/setup/setup-workspace";
import { WidgetStack } from "~/features/widgets/widget-layout";

import { RepLegalSection } from "./rep-legal-section";

export function AfiliacionTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => (
        <WidgetStack>
          <RepLegalSection leadId={data.lead.id} data={data} />
          <SetupWorkspace data={data} />
        </WidgetStack>
      )}
    </Show>
  );
}
