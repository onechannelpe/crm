import type { ParentProps } from "solid-js";

import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";

import styles from "./widget-card.module.css";

//   dashboard    grid tile (secondary bg, bordered, rounded)
//   record-page  record detail card (primary bg, framed inner content box)
//   side-column  side-panel stacked widget (borderless, bottom-divider rows)
export type WidgetCardVariant = "dashboard" | "record-page" | "side-column";

export function WidgetCard(
  props: ParentProps<{ variant?: WidgetCardVariant; class?: string }>,
) {
  return (
    <div
      class={`${styles.card} ${props.class ?? ""}`}
      data-variant={props.variant ?? "record-page"}
    >
      {props.children}
    </div>
  );
}

export function WidgetCardHeader(props: ParentProps<{ class?: string }>) {
  return (
    <div class={`${styles.header} ${props.class ?? ""}`}>{props.children}</div>
  );
}

export function WidgetCardTitle(props: { text: string }) {
  return (
    <div class={styles.title}>
      <OverflowingText text={props.text} style={{ width: "100%" }} />
    </div>
  );
}

export function WidgetCardHeaderActions(props: ParentProps) {
  return (
    <div class={styles.rightContainer}>
      <div class={styles.actionsContainer}>{props.children}</div>
    </div>
  );
}

export function WidgetCardContent(props: ParentProps<{ class?: string }>) {
  return (
    <div class={`${styles.content} ${props.class ?? ""}`}>{props.children}</div>
  );
}

export function WidgetCardActions(
  props: ParentProps<{
    align?: "start" | "end";
    class?: string;
    stack?: boolean;
  }>,
) {
  return (
    <div
      class={props.class}
      classList={{
        [styles.actions]: true,
        [styles.actionsStart]: props.align === "start",
        [styles.actionsStack]: props.stack,
      }}
    >
      {props.children}
    </div>
  );
}

export function WidgetCardSubsectionHeader(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button
      type="button"
      class={styles.subsectionHeader}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function WidgetCardSubsectionChevron(
  props: ParentProps<{ isExpanded: boolean }>,
) {
  return (
    <div
      class={`${styles.subsectionChevron} ${
        props.isExpanded ? styles.subsectionChevronExpanded : ""
      }`}
    >
      {props.children}
    </div>
  );
}
