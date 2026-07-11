import {
  createContext,
  createSignal,
  For,
  Show,
  useContext,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import Checkbox from "~/components/icons/checkbox";
import ChevronDown from "~/components/icons/chevron-down";
import CircleAlert from "~/components/icons/circle-alert";
import List from "~/components/icons/list";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Point from "~/components/icons/point";
import type { Json } from "~/contracts/json";

import styles from "./json-tree.module.css";

type IconComponent = Component<{ size?: number; color?: string }>;
type JsonObject = { [key: string]: Json };
type ShouldExpand = (params: { keyPath: string; depth: number }) => boolean;
type JsonTreeConfig = {
  shouldExpandNodeInitially: ShouldExpand;
  emptyArrayLabel: string;
  emptyObjectLabel: string;
  emptyStringLabel: string;
  onNodeValueClick?: (valueAsString: string) => void;
};

const JsonTreeConfigContext = createContext<JsonTreeConfig>();

function useConfig(): JsonTreeConfig {
  const config = useContext(JsonTreeConfigContext);
  if (!config) throw new Error("JsonTree node rendered outside JsonTree");
  return config;
}

function isJsonArray(value: Json): value is Json[] {
  return Array.isArray(value);
}

function isJsonObject(value: Json): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function NodeLabel(props: { label: string; icon: IconComponent }) {
  return (
    <span class={styles.labelContainer}>
      <Dynamic component={props.icon} size={16} />
      <span>{props.label}</span>
    </span>
  );
}

function NodeValue(props: { valueAsString: string }) {
  const config = useConfig();
  return (
    <Show
      when={config.onNodeValueClick}
      fallback={<span class={styles.value}>{props.valueAsString}</span>}
    >
      {(copy) => (
        <button
          type="button"
          class={styles.value}
          onClick={() => copy()(props.valueAsString)}
        >
          {props.valueAsString}
        </button>
      )}
    </Show>
  );
}

function ValueNode(props: {
  label?: string;
  valueAsString: string;
  icon: IconComponent;
}) {
  return (
    <li class={styles.valueListItem}>
      <Show when={props.label}>
        {(label) => <NodeLabel label={label()} icon={props.icon} />}
      </Show>
      <NodeValue valueAsString={props.valueAsString} />
    </li>
  );
}

type Entry = { id: string; value: Json };

function NestedNode(props: {
  label?: string;
  icon: IconComponent;
  entries: Entry[];
  count: (value: number) => string;
  emptyText: string;
  depth: number;
  keyPath: string;
}) {
  const config = useConfig();
  const [isOpen, setIsOpen] = createSignal(
    config.shouldExpandNodeInitially({
      keyPath: props.keyPath,
      depth: props.depth,
    }),
  );
  const children = (
    <ul classList={{ [styles.list]: true, [styles.nested]: props.depth > 0 }}>
      <Show
        when={props.entries.length > 0}
        fallback={
          <li class={styles.valueListItem}>
            <NodeValue valueAsString={props.emptyText} />
          </li>
        }
      >
        <For each={props.entries}>
          {(entry) => (
            <JsonNode
              label={entry.id}
              value={entry.value}
              depth={props.depth + 1}
              keyPath={
                props.keyPath ? `${props.keyPath}.${entry.id}` : entry.id
              }
            />
          )}
        </For>
      </Show>
    </ul>
  );

  if (props.label === undefined)
    return <li class={styles.container}>{children}</li>;
  return (
    <li class={styles.container}>
      <div class={styles.labelRow}>
        <button
          type="button"
          class={styles.arrowButton}
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen() ? "Contraer" : "Expandir"}
        >
          <span class={styles.chevron} data-open={isOpen() ? "" : undefined}>
            <ChevronDown size={16} />
          </span>
        </button>
        <NodeLabel label={props.label} icon={props.icon} />
        <span class={styles.elementsCount}>
          {props.count(props.entries.length)}
        </span>
      </div>
      <Show when={isOpen()}>{children}</Show>
    </li>
  );
}

function JsonNode(props: {
  label?: string;
  value: Json;
  depth: number;
  keyPath: string;
}) {
  const config = useConfig();
  const value = props.value;
  if (value === null)
    return (
      <ValueNode label={props.label} icon={CircleAlert} valueAsString="null" />
    );
  if (typeof value === "string")
    return (
      <ValueNode
        label={props.label}
        icon={MessageSquare}
        valueAsString={value === "" ? config.emptyStringLabel : value}
      />
    );
  if (typeof value === "number")
    return (
      <ValueNode
        label={props.label}
        icon={Point}
        valueAsString={String(value)}
      />
    );
  if (typeof value === "boolean")
    return (
      <ValueNode
        label={props.label}
        icon={Checkbox}
        valueAsString={String(value)}
      />
    );
  if (isJsonArray(value)) {
    return (
      <NestedNode
        label={props.label}
        icon={List}
        entries={value.map((entry, index) => ({
          id: String(index),
          value: entry,
        }))}
        count={(count) => `[${count}]`}
        emptyText={config.emptyArrayLabel}
        depth={props.depth}
        keyPath={props.keyPath}
      />
    );
  }
  if (isJsonObject(value)) {
    return (
      <NestedNode
        label={props.label}
        icon={Package}
        entries={Object.entries(value).map(([id, entry]) => ({
          id,
          value: entry,
        }))}
        count={(count) => `{${count}}`}
        emptyText={config.emptyObjectLabel}
        depth={props.depth}
        keyPath={props.keyPath}
      />
    );
  }
  return null;
}

export function JsonTree(props: {
  value: Json;
  shouldExpandNodeInitially: ShouldExpand;
  emptyArrayLabel: string;
  emptyObjectLabel: string;
  emptyStringLabel: string;
  onNodeValueClick?: (valueAsString: string) => void;
}) {
  const config: JsonTreeConfig = {
    shouldExpandNodeInitially: props.shouldExpandNodeInitially,
    emptyArrayLabel: props.emptyArrayLabel,
    emptyObjectLabel: props.emptyObjectLabel,
    emptyStringLabel: props.emptyStringLabel,
    onNodeValueClick: props.onNodeValueClick,
  };
  return (
    <JsonTreeConfigContext.Provider value={config}>
      <ul class={styles.list}>
        <JsonNode value={props.value} depth={0} keyPath="" />
      </ul>
    </JsonTreeConfigContext.Provider>
  );
}
