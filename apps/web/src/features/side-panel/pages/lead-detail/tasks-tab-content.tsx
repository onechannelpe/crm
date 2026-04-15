import { For } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import {
  blockingTaskLabel,
  mapLeadActionsToUi,
} from "~/features/pipeline/detail/lead-workflow-ui";
import {
  TimelineBody,
  TimelineEntry,
  TimelineIcon,
  TimelineMeta,
  TimelineMonth,
  TimelineSection,
  TimelineTitle,
} from "~/features/side-panel/components/timeline";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

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
    <TimelineSection>
      <TimelineMonth>Tasks</TimelineMonth>
      <For each={tasks}>
        {(task) => (
          <TimelineEntry>
            <TimelineIcon>
              <Checkbox size={12} />
            </TimelineIcon>
            <TimelineBody>
              <TimelineTitle>{task.title}</TimelineTitle>
              <TimelineMeta>{task.meta}</TimelineMeta>
            </TimelineBody>
          </TimelineEntry>
        )}
      </For>
    </TimelineSection>
  );
}
