import { createAsync } from "@solidjs/router";
import { ErrorBoundary, For, Show } from "solid-js";

import { ReleaseNotes } from "~/features/releases/components";
import { fetchLatestGithubReleaseTag } from "~/lib/releases/fetch-latest-release-tag";
import { getVisibleReleaseNotes } from "~/lib/releases/get-visible-releases";
import { loadLocalReleaseNotesResult } from "~/lib/releases/load-local-release-notes";
import { buildReleaseListJsonLd, JsonLd } from "~/lib/seo/json-ld";

import { RELEASES_PAGE_COPY } from "./release-page.data";

import styles from "./releases-page.module.css";

export default function ReleasesPage() {
  const { notes: allNotes, skippedCount } = loadLocalReleaseNotesResult();
  const latestTag = createAsync(() => fetchLatestGithubReleaseTag());

  const visibleNotes = () =>
    import.meta.env.DEV
      ? allNotes
      : getVisibleReleaseNotes(allNotes, latestTag() ?? null);

  if (skippedCount > 0) {
    console.warn(
      `[releases] loaded with ${skippedCount} skipped invalid file(s)`,
    );
  }

  return (
    <ErrorBoundary fallback={<p>No se pudieron cargar los releases.</p>}>
      <section class={styles.hero}>
        <h1 class={styles.heroTitle}>
          {RELEASES_PAGE_COPY.titleMuted}
          <br />
          {RELEASES_PAGE_COPY.titleBold}
        </h1>
        <p class={styles.heroBody}>{RELEASES_PAGE_COPY.heroBody}</p>
        <a
          class={styles.heroCta}
          href={RELEASES_PAGE_COPY.technicalNotesHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          {RELEASES_PAGE_COPY.technicalNotesLabel}
        </a>
      </section>

      <Show when={visibleNotes().length > 0}>
        <JsonLd data={buildReleaseListJsonLd(visibleNotes())} />
      </Show>

      <ReleaseNotes.Root
        titleBold={RELEASES_PAGE_COPY.titleBold}
        titleMuted={RELEASES_PAGE_COPY.titleMuted}
      >
        <Show
          when={allNotes.length > 0}
          fallback={
            <ReleaseNotes.EmptyMessage>
              Releases were not found. Add release notes under
              `apps/web/content/releases`.
            </ReleaseNotes.EmptyMessage>
          }
        >
          <Show
            when={import.meta.env.DEV || latestTag() !== undefined}
            fallback={
              <ReleaseNotes.EmptyMessage>
                Loading releases...
              </ReleaseNotes.EmptyMessage>
            }
          >
            <Show
              when={visibleNotes().length > 0}
              fallback={
                <ReleaseNotes.EmptyMessage>
                  No releases are visible yet for the current published version.
                </ReleaseNotes.EmptyMessage>
              }
            >
              <For each={visibleNotes()}>
                {(note, idx) => (
                  <>
                    <ReleaseNotes.ReleaseEntry
                      content={note.content}
                      date={note.date}
                      release={note.release}
                    />
                    <Show when={idx() < visibleNotes().length - 1}>
                      <ReleaseNotes.Divider />
                    </Show>
                  </>
                )}
              </For>
            </Show>
          </Show>
        </Show>
      </ReleaseNotes.Root>
    </ErrorBoundary>
  );
}
