import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { CreateFieldsSection } from "~/features/record-show/sections/fields";
import { SunatLookupSection } from "~/features/record-show/sections/sunat-lookup";

import styles from "~/features/record-show/tabs/home.module.css";

export function DraftHomeTab(props: { context: RecordContext }) {
  return (
    <Show when={props.context.kind === "draft" ? props.context : null} keyed>
      {(draft) => (
        <div class={styles.homeContent}>
          <CreateFieldsSection
            razonSocial={draft.razonSocial}
            address={draft.address}
          />
          <SunatLookupSection status={draft.engineStatus} />
        </div>
      )}
    </Show>
  );
}
