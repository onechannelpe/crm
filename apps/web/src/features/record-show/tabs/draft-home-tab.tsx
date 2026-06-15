import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { CreateFieldsSection } from "~/features/record-show/sections/fields";
import { SunatLookupSection } from "~/features/record-show/sections/sunat-lookup";

import styles from "~/features/record-show/tabs/home.module.css";

export function DraftHomeTab(props: { context: RecordContext }) {
  // Non-keyed narrowing: the draft pane stays mounted while fields change, so the
  // editable inputs keep focus across keystrokes.
  return (
    <Show when={props.context.kind === "draft" && props.context}>
      {(draft) => (
        <div class={styles.homeContent}>
          <CreateFieldsSection
            razonSocial={draft().razonSocial}
            address={draft().address}
            onRazonSocialInput={draft().setRazonSocial}
            onAddressInput={draft().setAddress}
            commercialScope={draft().commercialScope}
          />
          <SunatLookupSection status={draft().engineStatus} />
        </div>
      )}
    </Show>
  );
}
