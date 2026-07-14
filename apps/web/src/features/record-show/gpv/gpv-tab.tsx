import { Show } from "solid-js";

import { MerchantGpvWidget } from "~/features/dashboards/record-show/merchant-gpv-widget";
import { WidgetList } from "~/features/page-layout/widget-list";
import { WidgetRenderer } from "~/features/page-layout/widget-renderer";
import type { RecordContext } from "~/features/record-show/model/record-context";

export function GpvTab(props: { context: RecordContext }) {
  const ruc = () =>
    props.context.kind === "lead" ? props.context.data.lead.ruc : undefined;

  return (
    <Show when={ruc()} keyed>
      {(value) => (
        <WidgetList>
          <WidgetRenderer title="GPV del comercio">
            <MerchantGpvWidget ruc={value} />
          </WidgetRenderer>
        </WidgetList>
      )}
    </Show>
  );
}
