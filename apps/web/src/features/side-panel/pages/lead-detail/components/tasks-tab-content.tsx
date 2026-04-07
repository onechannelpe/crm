import { For } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import {
  blockingTaskLabel,
  mapLeadActionsToUi,
} from "~/features/pipeline/detail/lead-workflow-ui";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "../page.module.css";

function deriveTasks(data: LeadDetailView) {
  const tasks = [{ title: "Siguiente paso", meta: data.lead.nextStep }];

  if (data.blockingFields.length > 0) {
    return tasks.concat(
      data.blockingFields.map((field) => ({
        title: blockingTaskLabel(field),
        meta: "Requerido para avanzar",
      })),
    );
  }

  if (data.availableActions.length > 0) {
    const actionItems = mapLeadActionsToUi(data.lead.id, data.availableActions);
    return tasks.concat(
      actionItems.map((action) => ({
        title: action.label,
        meta: "Disponible ahora",
      })),
    );
  }

  return tasks.concat({
    title: "Sin bloqueos",
    meta: "No hay tareas pendientes en este estado",
  });
}

export function TasksTabContent(props: { data: LeadDetailView }) {
  const tasks = deriveTasks(props.data);

  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>Tasks</div>
      <For each={tasks}>
        {(task) => (
          <div class={styles.timelineEntry}>
            <div class={styles.timelineIcon}>
              <Checkbox size={12} />
            </div>
            <div class={styles.timelineBody}>
              <div class={styles.timelineTitle}>{task.title}</div>
              <div class={styles.timelineMeta}>{task.meta}</div>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
