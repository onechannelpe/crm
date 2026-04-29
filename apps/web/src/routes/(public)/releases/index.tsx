import type { Component } from "solid-js";
import { For } from "solid-js";

import { releases, type ReleaseEntry } from "~/features/releases/registry";
import { APP_LOCALE } from "~/lib/locale";

import styles from "./releases.module.css";
import proseStyles from "~/components/layout/prose.module.css";

const releaseMdx = import.meta.glob<{ default: Component }>(
  "../../../../content/releases/*.mdx",
  { eager: true },
);

function getContent(version: string): Component | undefined {
  const key = Object.keys(releaseMdx).find((k) =>
    k.endsWith(`/${version}.mdx`),
  );
  return key ? releaseMdx[key]?.default : undefined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(APP_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ReleaseItem(props: { entry: ReleaseEntry; isLast: boolean }) {
  const Content = getContent(props.entry.version);
  return (
    <>
      <div class={styles.release}>
        <div class={styles.releaseLeft}>
          <span class={styles.releaseVersion}>{props.entry.version}</span>
          <span class={styles.releaseDate}>{formatDate(props.entry.date)}</span>
        </div>
        <div class={`${styles.releaseContent} ${proseStyles.prose}`}>
          {Content && <Content />}
        </div>
      </div>
      {!props.isLast && <div class={styles.divider} />}
    </>
  );
}

export default function ReleasesPage() {
  return (
    <div class={styles.page}>
      <div class={styles.pageTitle}>
        <span class={styles.titleMuted}>Últimas</span>
        <span class={styles.titleBold}>Actualizaciones</span>
      </div>
      <For each={releases}>
        {(entry, idx) => (
          <ReleaseItem entry={entry} isLast={idx() === releases.length - 1} />
        )}
      </For>
    </div>
  );
}
