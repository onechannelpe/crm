import { For, Show } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "../page.module.css";

function timelineIcon(kind: LeadDetailView["timeline"][number]["kind"]) {
  if (kind === "call") return <Phone size={12} />;
  if (kind === "stage-change") return <Package size={12} />;
  return <CalendarDays size={12} />;
}

export function TimelineTabContent(props: { data: LeadDetailView }) {
  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>Timeline</div>
      <For each={props.data.timeline}>
        {(item) => (
          <div class={styles.timelineEntry}>
            <div class={styles.timelineIcon}>{timelineIcon(item.kind)}</div>
            <div class={styles.timelineBody}>
              <div class={styles.timelineTitle}>{item.title}</div>
              <div class={styles.timelineMeta}>
                {item.actorDisplayName} · {formatDateTime(item.occurredAt)}
              </div>
              <div class={styles.timelineDescription}>{item.description}</div>
            </div>
          </div>
        )}
      </For>
      <Show when={props.data.timeline.length === 0}>
        <div class={styles.timelineEntry}>
          <div class={styles.timelineIcon}>
            <CalendarDays size={12} />
          </div>
          <div class={styles.timelineBody}>
            <div class={styles.timelineTitle}>Sin actividad registrada</div>
            <div class={styles.timelineMeta}>
              El lead aún no tiene historial
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
