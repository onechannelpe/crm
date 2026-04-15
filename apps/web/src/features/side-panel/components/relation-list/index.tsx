import { A } from "@solidjs/router";
import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function RelationList(props: ParentProps) {
  return <div class={styles.relationList}>{props.children}</div>;
}

export function RelationRow(props: ParentProps) {
  return <div class={styles.relationRow}>{props.children}</div>;
}

export function RelationMeta(props: ParentProps) {
  return <span class={styles.relationMeta}>{props.children}</span>;
}

export function ActionRowButton(
  props: ParentProps & { onClick?: () => void; disabled?: boolean },
) {
  return (
    <button
      type="button"
      class={styles.actionRowButton}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

export function ActionRowLink(props: ParentProps & { href: string }) {
  return (
    <A class={styles.actionRowLink} href={props.href}>
      {props.children}
    </A>
  );
}

export function PlusButton(props: ParentProps & { onClick?: () => void }) {
  return (
    <button type="button" class={styles.plusButton} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
