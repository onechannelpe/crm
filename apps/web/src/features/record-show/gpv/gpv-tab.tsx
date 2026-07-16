import { Show } from "solid-js";

import { MerchantGpvWidget } from "~/features/dashboards/record-show/merchant-gpv-widget";
import type { RecordContext } from "~/features/record-show/model/record-context";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetStack } from "~/features/widgets/widget-layout";

export function GpvTab(props: { context: RecordContext }) {
  const ruc = () =>
    props.context.kind === "lead" ? props.context.data.lead.ruc : undefined;

  return (
    <Show when={ruc()} keyed>
      {(value) => (
        <WidgetStack>
          <WidgetCardShell variant="record-page" title="GPV del comercio">
            <MerchantGpvWidget ruc={value} />
          </WidgetCardShell>
        </WidgetStack>
      )}
    </Show>
  );
}
