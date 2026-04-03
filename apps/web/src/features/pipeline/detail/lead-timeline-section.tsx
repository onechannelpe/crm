import { For, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleAlert from "~/components/icons/circle-alert";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import { formatDateTime } from "~/lib/utils";
import type { TimelineItem } from "~/server/pipeline/contracts/lead-detail";

import styles from "./lead-detail-overview.module.css";

function timelineIcon(kind: TimelineItem["kind"]) {
  if (kind === "call") return <Phone size={14} />;
  if (kind === "assignment") return <Building2 size={14} />;
  if (kind === "stage-change") return <Package size={14} />;
  return <CalendarDays size={14} />;
}

export function LeadTimelineSection(props: { timeline: TimelineItem[] }) {
  return (
    <section class={styles.section}>
      <div class={styles.sectionTitle}>Timeline</div>
      <div class={styles.timeline}>
        <For each={props.timeline}>
          {(item) => (
            <div class={styles.timelineItem}>
              <span class={styles.timelineIcon}>{timelineIcon(item.kind)}</span>
              <div class={styles.timelineBody}>
                <div class={styles.timelineTitle}>{item.title}</div>
                <div class={styles.timelineMeta}>
                  {formatDateTime(item.occurredAt)} · {item.actorDisplayName}
                </div>
                <div class={styles.timelineDescription}>{item.description}</div>
              </div>
            </div>
          )}
        </For>
        <Show when={props.timeline.length === 0}>
          <div class={styles.emptyBlock}>
            <span class={styles.timelineIcon}>
              <CircleAlert size={14} />
            </span>
            <div>
              <div class={styles.timelineTitle}>Sin historial todavia</div>
              <div class={styles.timelineMeta}>
                Este prospecto aun no tiene historial registrado.
              </div>
            </div>
          </div>
        </Show>
      </div>
    </section>
  );
}
