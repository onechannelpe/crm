import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { BootstrapWidget } from "~/features/record-show/widgets/bootstrap";
import { CreateFieldsWidget } from "~/features/record-show/widgets/fields";
import { SunatWidget } from "~/features/record-show/widgets/sunat";

import styles from "~/features/record-show/tabs/home.module.css";

export function DraftHomeTab(props: { context: RecordContext }) {
  return (
    <Show when={props.context.kind === "draft" ? props.context : null} keyed>
      {(draft) => (
        <div class={styles.homeContent}>
          <CreateFieldsWidget
            razonSocial={draft.razonSocial}
            address={draft.address}
          />
          <BootstrapWidget
            engineStatus={draft.engineStatus}
            submitting={draft.submitting}
            onSubmit={draft.onSubmit}
          />
          <SunatWidget />
        </div>
      )}
    </Show>
  );
}
