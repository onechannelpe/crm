import {
  createContext,
  createMemo,
  createSignal,
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

import styles from "./json-tree.module.css";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type IconComponent = Component<{ size?: number; color?: string }>;

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
  const ctx = useContext(JsonTreeConfigContext);
  if (!ctx) throw new Error("JsonTree node rendered outside JsonTree");
  return ctx;
}

function isArray(value: JsonValue): value is JsonValue[] {
  return Array.isArray(value);
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
  const interactive = () => config.onNodeValueClick !== undefined;
  return (
    <span
      class={styles.value}
      role={interactive() ? "button" : undefined}
      tabIndex={interactive() ? 0 : undefined}
      onClick={
        interactive()
          ? () => config.onNodeValueClick?.(props.valueAsString)
          : undefined
      }
    >
      {props.valueAsString}
    </span>
  );
}

function ValueNode(props: {
  label?: string;
  valueAsString: string;
  icon?: IconComponent;
}) {
  return (
    <li class={styles.valueListItem}>
      <Show when={props.label !== undefined && props.icon}>
        <NodeLabel
          label={props.label as string}
          icon={props.icon as IconComponent}
        />
      </Show>
      <NodeValue valueAsString={props.valueAsString} />
    </li>
  );
}

function NestedNode(props: {
  label?: string;
  icon: IconComponent;
  entries: Array<{ id: string; value: JsonValue }>;
  renderCount: (count: number) => string;
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
        {props.entries.map((entry) => (
          <JsonNode
            label={entry.id}
            value={entry.value}
            depth={props.depth + 1}
            keyPath={props.keyPath ? `${props.keyPath}.${entry.id}` : entry.id}
          />
        ))}
      </Show>
    </ul>
  );

  return (
    <Show
      when={props.label !== undefined}
      fallback={<li class={styles.container}>{children}</li>}
    >
      <li class={styles.container}>
        <div class={styles.labelRow}>
          <button
            class={styles.arrowButton}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen() ? "Collapse" : "Expand"}
          >
            <span class={styles.chevron} data-open={isOpen() ? "" : undefined}>
              <ChevronDown size={16} />
            </span>
          </button>
          <NodeLabel label={props.label as string} icon={props.icon} />
          <span class={styles.elementsCount}>
            {props.renderCount(props.entries.length)}
          </span>
        </div>
        <Show when={isOpen()}>{children}</Show>
      </li>
    </Show>
  );
}

function JsonNode(props: {
  label?: string;
  value: JsonValue;
  depth: number;
  keyPath: string;
}) {
  const config = useConfig();
  const kind = createMemo(() => {
    const value = props.value;
    if (value === null || value === undefined) return "null" as const;
    if (typeof value === "string") return "string" as const;
    if (typeof value === "number") return "number" as const;
    if (typeof value === "boolean") return "boolean" as const;
    if (isArray(value)) return "array" as const;
    return "object" as const;
  });

  return (
    <Show
      when={kind() === "object" || kind() === "array"}
      fallback={
        <ValueNode
          label={props.label}
          icon={
            kind() === "null"
              ? CircleAlert
              : kind() === "string"
                ? MessageSquare
                : kind() === "number"
                  ? Point
                  : Checkbox
          }
          valueAsString={
            kind() === "null"
              ? "null"
              : kind() === "string"
                ? (props.value as string) === ""
                  ? config.emptyStringLabel
                  : (props.value as string)
                : String(props.value)
          }
        />
      }
    >
      <Show
        when={kind() === "array"}
        fallback={
          <NestedNode
            label={props.label}
            icon={Package}
            entries={Object.entries(
              props.value as Record<string, JsonValue>,
            ).map(([key, value]) => ({ id: key, value }))}
            renderCount={(count) => `{${count}}`}
            emptyText={config.emptyObjectLabel}
            depth={props.depth}
            keyPath={props.keyPath}
          />
        }
      >
        <NestedNode
          label={props.label}
          icon={List}
          entries={(props.value as JsonValue[]).map((value, index) => ({
            id: String(index),
            value,
          }))}
          renderCount={(count) => `[${count}]`}
          emptyText={config.emptyArrayLabel}
          depth={props.depth}
          keyPath={props.keyPath}
        />
      </Show>
    </Show>
  );
}

export function JsonTree(props: {
  value: JsonValue;
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
