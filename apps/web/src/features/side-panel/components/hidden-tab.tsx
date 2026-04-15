import styles from "./hidden-tab.module.css";

export function HiddenTabContent(props: { title: string }) {
  return <div class={styles.container}>{props.title}</div>;
}
