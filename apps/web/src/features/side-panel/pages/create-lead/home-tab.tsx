import { Show, createMemo } from "solid-js";

import type { TabContentProps } from "../record-page/tabs/content-props";
import { BootstrapWidget } from "../record-page/widgets/bootstrap";
import { CreateFieldsWidget } from "../record-page/widgets/fields";
import { SunatWidget } from "../record-page/widgets/sunat";

import styles from "../record-page/tabs/home.module.css";

export function CreateLeadHomeTab(props: TabContentProps) {
  const createProps = createMemo(() =>
    props.mode === "create" ? props : null,
  );

  return (
    <Show when={createProps()} keyed>
      {(create) => (
        <div class={styles.homeContent}>
          <CreateFieldsWidget
            razonSocial={create.razonSocial}
            address={create.address}
          />
          <BootstrapWidget
            engineStatus={create.engineStatus}
            submitting={create.submitting}
            onSubmit={create.onSubmit}
          />
          <SunatWidget />
        </div>
      )}
    </Show>
  );
}
