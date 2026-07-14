import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { DetailFieldsSection } from "~/features/record-show/sections/fields";
import { WidgetStack } from "~/features/widgets/widget-layout";

export function DatosTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => (
        <WidgetStack>
          <DetailFieldsSection data={data} />
        </WidgetStack>
      )}
    </Show>
  );
}
