import { For, Show } from "solid-js";

import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityGrid,
  ActivityRowDescription,
  ActivityRowTitle,
  ActivitySection,
  ActivityTabContainer,
  ActivityTile,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "./notes-tab-content.module.css";

export function NotesTabContent(props: { data: LeadDetailView }) {
  const notes = () =>
    props.data.timeline.filter((item) => item.kind === "note");

  return (
    <ActivityTabContainer>
      <Show
        when={notes().length > 0}
        fallback={
          <ActivityTabEmptyState
            type="noNote"
            title="No notes"
            subtitle="There are no associated notes with this record."
          />
        }
      >
        <ActivitySection title="All" count={notes().length}>
          <ActivityGrid>
            <For each={notes()}>
              {(note) => (
                <ActivityTile
                  footer={
                    <span class={styles.noteFooter}>
                      <span>{note.actorDisplayName}</span>
                      <span class={styles.noteFooterDot}></span>
                      <span>{formatDateTime(note.occurredAt)}</span>
                    </span>
                  }
                >
                  <ActivityRowTitle>
                    <OverflowingText text={note.title} />
                  </ActivityRowTitle>
                  <ActivityRowDescription>
                    {note.description}
                  </ActivityRowDescription>
                </ActivityTile>
              )}
            </For>
          </ActivityGrid>
        </ActivitySection>
      </Show>
    </ActivityTabContainer>
  );
}
