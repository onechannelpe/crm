import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { CreateFieldsSection } from "~/features/record-show/sections/fields";

import styles from "~/features/record-show/tabs/home.module.css";

export function RegistroTab(props: { context: RecordContext }) {
  // Non-keyed narrowing: the draft pane stays mounted while fields change, so the
  // editable inputs keep focus across keystrokes.
  return (
    <Show when={props.context.kind === "draft" && props.context}>
      {(draft) => (
        <div class={styles.homeContent}>
          <CreateFieldsSection commercialScope={draft().commercialScope} />
        </div>
      )}
    </Show>
  );
}
