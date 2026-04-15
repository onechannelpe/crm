import { For, Show } from "solid-js";

import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityGrid,
  ActivitySection,
  ActivityTabContainer,
  ActivityTile,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import contentStyles from "../../components/activity-tabs/content.module.css";

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
                    <span class={contentStyles.noteFooter}>
                      <span>{note.actorDisplayName}</span>
                      <span class={contentStyles.noteFooterDot}></span>
                      <span>{formatDateTime(note.occurredAt)}</span>
                    </span>
                  }
                >
                  <div class={contentStyles.noteTitle}>
                    <OverflowingText text={note.title} />
                  </div>
                  <div class={contentStyles.noteBody}>{note.description}</div>
                </ActivityTile>
              )}
            </For>
          </ActivityGrid>
        </ActivitySection>
      </Show>
    </ActivityTabContainer>
  );
}
