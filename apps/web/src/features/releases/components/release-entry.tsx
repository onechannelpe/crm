import type { Component } from "solid-js";

import { formatReleaseDisplayDate } from "~/lib/releases/format-release-display-date";

import { ReleaseMarkdown } from "./release-markdown";

import styles from "./release-notes.module.css";

type ReleaseEntryProps = {
  content: Component;
  date?: string;
  release: string;
};

export function ReleaseEntry(props: ReleaseEntryProps) {
  return (
    <article class={styles.entry} id={props.release}>
      <div class={styles.meta}>
        <span class={styles.version}>{props.release}</span>
        <span class={styles.date}>{formatReleaseDisplayDate(props.date)}</span>
      </div>
      <div class={styles.content}>
        <ReleaseMarkdown content={props.content} />
      </div>
    </article>
  );
}
