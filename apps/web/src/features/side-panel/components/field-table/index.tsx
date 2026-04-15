import type { JSX, ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function FieldTable(props: ParentProps) {
  return <div class={styles.fieldTable}>{props.children}</div>;
}

export function FieldRow(
  props: ParentProps<{
    readonly?: boolean;
    hovered?: boolean;
    onMouseEnter?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
    onMouseLeave?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
    onFocusIn?: JSX.EventHandlerUnion<HTMLDivElement, FocusEvent>;
    onFocusOut?: JSX.EventHandlerUnion<HTMLDivElement, FocusEvent>;
  }>,
) {
  return (
    <div
      class={`${styles.fieldRow} ${props.readonly ? styles.fieldRowReadonly : ""} ${props.hovered ? styles.fieldRowHovered : ""}`}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onFocusIn={props.onFocusIn}
      onFocusOut={props.onFocusOut}
    >
      {props.children}
    </div>
  );
}

export function FieldLabel(props: ParentProps) {
  return <div class={styles.fieldLabel}>{props.children}</div>;
}

export function FieldIcon(props: ParentProps) {
  return <div class={styles.fieldIcon}>{props.children}</div>;
}

export function FieldLabelText(props: ParentProps) {
  return <div class={styles.fieldLabelText}>{props.children}</div>;
}

export function FieldValue(props: ParentProps) {
  return (
    <div class={styles.fieldValue}>
      <div class={styles.fieldValueDisplay}>{props.children}</div>
    </div>
  );
}

export function FieldTextValue(props: ParentProps) {
  return <span class={styles.fieldTextValue}>{props.children}</span>;
}
