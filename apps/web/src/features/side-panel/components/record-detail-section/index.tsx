import { type ParentProps } from "solid-js";

import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";

import styles from "./styles.module.css";

export function RecordDetailSection(props: ParentProps<{ class?: string }>) {
  return (
    <section class={`${styles.section} ${props.class ?? ""}`}>
      {props.children}
    </section>
  );
}

export function RecordDetailSectionHeader(
  props: ParentProps<{ class?: string }>,
) {
  return (
    <header class={`${styles.header} ${props.class ?? ""}`}>
      {props.children}
    </header>
  );
}

export function RecordDetailSectionTitle(props: { text: string }) {
  return (
    <div class={styles.title}>
      <OverflowingText text={props.text} style={{ width: "100%" }} />
    </div>
  );
}

export function RecordDetailSectionBody(
  props: ParentProps<{ class?: string }>,
) {
  return (
    <div class={`${styles.body} ${props.class ?? ""}`}>{props.children}</div>
  );
}

export function RecordDetailSectionActions(
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

export function RecordDetailSubsectionHeader(
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

export function RecordDetailSubsectionChevron(
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
