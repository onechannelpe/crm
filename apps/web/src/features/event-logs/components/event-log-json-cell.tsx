import { createSignal, Show } from "solid-js";

import { isTwoFirstDepths } from "~/components/ui/display/json-tree/is-two-first-depths";
import { JsonTree } from "~/components/ui/display/json-tree/json-tree";
import { ExpandedFieldDisplay } from "~/components/ui/overlay/expanded-field-display";
import type { JsonObject } from "~/contracts/event-logs/event-log";

import styles from "./event-log-json-cell.module.css";

export function EventLogJsonCell(props: { value: JsonObject }) {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [anchor, setAnchor] = createSignal<HTMLButtonElement>();
  const isEmpty = () => Object.keys(props.value).length === 0;

  return (
    <Show when={!isEmpty()} fallback={<span class={styles.empty}>-</span>}>
      <button
        type="button"
        ref={setAnchor}
        class={styles.preview}
        onClick={() => setIsExpanded(true)}
      >
        {JSON.stringify(props.value)}
      </button>
      <Show when={isExpanded()}>
        <ExpandedFieldDisplay
          anchor={anchor()}
          onClickOutside={() => setIsExpanded(false)}
        >
          <JsonTree
            value={props.value}
            shouldExpandNodeInitially={isTwoFirstDepths}
            emptyArrayLabel="Arreglo vacío"
            emptyObjectLabel="Objeto vacío"
            emptyStringLabel="[texto vacío]"
            onNodeValueClick={(text) =>
              void navigator.clipboard?.writeText(text)
            }
          />
        </ExpandedFieldDisplay>
      </Show>
    </Show>
  );
}
