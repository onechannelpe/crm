import type { UpdateEntry } from "~/features/updates/model";

import { formatUpdateDisplayDate } from "./format-update-display-date";
import { UpdateMarkdown } from "./update-markdown";

import styles from "./styles/entry.module.css";

export function UpdateEntryCard(props: { entry: UpdateEntry }) {
  return (
    <article class={styles.entry} id={props.entry.id}>
      <div class={styles.meta}>
        <span class={styles.kind}>{props.entry.kind}</span>
        <span class={styles.version}>{props.entry.cadence}</span>
        <span class={styles.date}>
          {formatUpdateDisplayDate(props.entry.date)}
        </span>
      </div>
      <div class={styles.content}>
        <h2 class={styles.contentTitle}>{props.entry.title}</h2>
        <UpdateMarkdown content={props.entry.content} />
      </div>
    </article>
  );
}
