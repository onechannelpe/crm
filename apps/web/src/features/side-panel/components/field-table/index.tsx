import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function FieldTable(props: ParentProps) {
  return <div class={styles.fieldTable}>{props.children}</div>;
}

export function FieldRow(props: ParentProps) {
  return <div class={styles.fieldRow}>{props.children}</div>;
}

export function FieldLabel(props: ParentProps) {
  return <div class={styles.fieldLabel}>{props.children}</div>;
}

export function FieldIcon(props: ParentProps) {
  return <div class={styles.fieldIcon}>{props.children}</div>;
}

export function FieldValue(props: ParentProps) {
  return <div class={styles.fieldValue}>{props.children}</div>;
}

export function FieldTextValue(props: ParentProps) {
  return <span class={styles.fieldTextValue}>{props.children}</span>;
}
