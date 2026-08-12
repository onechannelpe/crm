import { clsx } from "clsx";
import { Show, children, type JSX } from "solid-js";

import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";

import styles from "./styles.module.css";

type MenuItemAccent = "default" | "danger" | "placeholder";

type MenuItemProps = {
  text: string;
  /*
    Rendered after the label as "· value", the way a search result names the
    object it belongs to. Kept as a separate slot rather than baked into `text`
    so the label alone owns the ellipsis when the row is too narrow.
  */
  contextualText?: string;
  leftComponent?: JSX.Element;
  rightComponent?: JSX.Element;
  accent?: MenuItemAccent;
  /*
    Marks the row the list has selected. Selection is driven by the list, not by
    DOM focus, so arrow keys can walk the rows while the caret stays in a search
    box above them.
  */
  focused?: boolean;
  disabled?: boolean;
  class?: string;
  onClick?: () => void;
  onHighlight?: () => void;
};

export function MenuItem(props: MenuItemProps) {
  const leftComponent = children(() => props.leftComponent);
  const rightComponent = children(() => props.rightComponent);

  return (
    <button
      type="button"
      class={clsx(styles.root, props.class)}
      // The visible label truncates, so name the control from the full strings.
      aria-label={
        props.contextualText
          ? `${props.text}, ${props.contextualText}`
          : props.text
      }
      data-accent={props.accent ?? "default"}
      data-focused={props.focused ? "" : undefined}
      disabled={props.disabled}
      onClick={() => props.onClick?.()}
      // Pointer and keyboard both move the list's selection here, so the
      // highlighted row and the row Enter acts on can never drift apart.
      onMouseEnter={() => props.onHighlight?.()}
      onFocus={() => props.onHighlight?.()}
    >
      <span class={styles.leftContent}>
        <Show when={leftComponent()}>{leftComponent()}</Show>

        <span class={styles.label}>
          <span class={styles.mainText}>
            <OverflowingText text={props.text} />
          </span>

          <Show when={props.contextualText}>
            {(contextualText) => (
              <span class={styles.contextualText}>
                <OverflowingText text={`· ${contextualText()}`} />
              </span>
            )}
          </Show>
        </span>
      </span>

      <Show when={rightComponent()}>
        <span class={styles.rightContent}>{rightComponent()}</span>
      </Show>
    </button>
  );
}
