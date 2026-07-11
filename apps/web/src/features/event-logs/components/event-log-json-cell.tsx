import { createSignal, Show } from "solid-js";

import { isTwoFirstDepths } from "~/components/ui/display/json-tree/is-two-first-depths";
import {
  JsonTree,
  type JsonValue,
} from "~/components/ui/display/json-tree/json-tree";
import { ExpandedFieldDisplay } from "~/components/ui/overlay/expanded-field-display";

import styles from "./event-log-json-cell.module.css";

type EventLogJsonCellProps = {
  value: Record<string, unknown> | null | undefined;
};

function copyToClipboard(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(text);
  }
}

export function EventLogJsonCell(props: EventLogJsonCellProps) {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  const isEmpty = () =>
    props.value === null ||
    props.value === undefined ||
    Object.keys(props.value).length === 0;

  return (
    <Show when={!isEmpty()} fallback={<span class={styles.empty}>-</span>}>
      <div
        ref={setAnchor}
        class={styles.preview}
        onClick={() => setIsExpanded(true)}
      >
        {JSON.stringify(props.value)}
      </div>
      <Show when={isExpanded()}>
        <ExpandedFieldDisplay
          anchor={anchor()}
          onClickOutside={() => setIsExpanded(false)}
        >
          <JsonTree
            value={props.value as JsonValue}
            shouldExpandNodeInitially={isTwoFirstDepths}
            emptyArrayLabel="Arreglo vacío"
            emptyObjectLabel="Objeto vacío"
            emptyStringLabel="[texto vacío]"
            onNodeValueClick={copyToClipboard}
          />
        </ExpandedFieldDisplay>
      </Show>
    </Show>
  );
}
