import { type ParentProps, Show, children } from "solid-js";

import styles from "./styles.module.css";

type PanelGroupProps = ParentProps<{ label: string }>;

export function PanelGroup(props: PanelGroupProps) {
  const resolved = children(() => props.children);

  const hasChildren = () => {
    const c = resolved();
    if (Array.isArray(c)) return c.filter(Boolean).length > 0;
    return Boolean(c);
  };

  return (
    <Show when={hasChildren()}>
      <div class={styles.group}>
        <span class={styles.label}>{props.label}</span>
        <div class={styles.content}>{resolved()}</div>
      </div>
    </Show>
  );
}
