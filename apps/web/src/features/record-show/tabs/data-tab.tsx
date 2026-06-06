import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { DetailFieldsSection } from "~/features/record-show/sections/fields";

export function DataTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => <DetailFieldsSection data={data} />}
    </Show>
  );
}
