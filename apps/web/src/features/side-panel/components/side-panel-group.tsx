import { type ParentProps, Show, children } from "solid-js";

import styles from "./side-panel-group.module.css";

type SidePanelGroupProps = ParentProps<{ label: string }>;

export function SidePanelGroup(props: SidePanelGroupProps) {
  const resolved = children(() => props.children);

  // Return null when there are no children (Req 12.2)
  const hasChildren = () => {
    const c = resolved();
    if (Array.isArray(c)) return c.filter(Boolean).length > 0;
    return Boolean(c);
  };

  return (
    <Show when={hasChildren()}>
      <div class={styles.group}>
        <span class={styles.label}>{props.label}</span>
        {resolved()}
      </div>
    </Show>
  );
}
