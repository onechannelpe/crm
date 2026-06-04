import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { DetailFieldsWidget } from "~/features/record-show/widgets/fields";
import { SunatWidget } from "~/features/record-show/widgets/sunat";

export function DataTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => (
        <>
          <DetailFieldsWidget data={data} />
          <SunatWidget data={data} />
        </>
      )}
    </Show>
  );
}
