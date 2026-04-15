import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function Widget(props: ParentProps) {
  return <section class={styles.widget}>{props.children}</section>;
}

export function WidgetHeader(props: ParentProps) {
  return <div class={styles.widgetHeader}>{props.children}</div>;
}

export function WidgetTitle(props: ParentProps) {
  return <h3 class={styles.widgetTitle}>{props.children}</h3>;
}

export function WidgetActions(props: ParentProps) {
  return <div class={styles.widgetActions}>{props.children}</div>;
}

export function WidgetSeeAllButton(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button type="button" class={styles.seeAllButton} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function WidgetOptionsButton(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button
      type="button"
      class={styles.widgetOptionsButton}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function WidgetSectionHeader(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button type="button" class={styles.sectionHeader} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
