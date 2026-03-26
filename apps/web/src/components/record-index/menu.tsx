import type { JSX } from "solid-js";

import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";

import styles from "./styles.module.css";

export function ViewBarMenu(props: {
  active?: boolean;
  children: JSX.Element;
  label: string;
  menuId: string;
  onDismiss: () => void;
  onToggle: () => void;
  open: boolean;
}) {
  let container: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: () => props.open,
    onDismiss: props.onDismiss,
    getContainer: () => container,
  });

  return (
    <div class={styles.menuWrap} ref={container}>
      <button
        type="button"
        class={styles.toolbarButton}
        aria-controls={props.menuId}
        aria-expanded={props.open ? "true" : "false"}
        aria-haspopup="menu"
        data-active={props.active ? "true" : "false"}
        data-open={props.open ? "true" : "false"}
        onClick={props.onToggle}
      >
        {props.label}
      </button>
      {props.open ? (
        <div class={styles.menu} id={props.menuId} role="menu">
          {props.children}
        </div>
      ) : null}
    </div>
  );
}
