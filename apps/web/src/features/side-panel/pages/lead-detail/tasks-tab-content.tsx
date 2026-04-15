import { createMemo, For, Show } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import {
  blockingTaskLabel,
  mapLeadActionsToUi,
} from "~/features/pipeline/detail/lead-workflow-ui";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityListCard,
  ActivityListRow,
  ActivityRowBody,
  ActivityRowEnd,
  ActivityRowIcon,
  ActivityRowMeta,
  ActivityRowTitle,
  ActivitySection,
  ActivityTabContainer,
} from "~/features/side-panel/components/activity-tabs/primitives";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

type TaskStatus = "TODO" | "DONE";

type TaskItem = {
  id: string;
  title: string;
  meta: string;
  status: TaskStatus;
};

function deriveTasks(
  data: LeadDetailView,
  isAssignedExecutive: boolean,
): TaskItem[] {
  const ownershipMeta = isAssignedExecutive
    ? "Assigned to you"
    : "Assigned to another executive";

  const tasks: TaskItem[] = [
    {
      id: "next-step",
      title: "Next step",
      meta: `${data.lead.nextStep} · ${ownershipMeta}`,
      status: "TODO",
    },
  ];

  if (data.blockingFields.length > 0) {
    return tasks.concat(
      data.blockingFields.map((field) => ({
        id: `blocking-${field}`,
        title: blockingTaskLabel(field),
        meta: "Required to move forward",
        status: "TODO" as const,
      })),
    );
  }

  if (data.availableActions.length > 0) {
    const actionItems = mapLeadActionsToUi(data.lead.id, data.availableActions);

    return tasks.concat(
      actionItems.map((action) => ({
        id: `action-${action.id}`,
        title: action.label,
        meta: isAssignedExecutive
          ? "Available now"
          : "Read-only: action available to assigned executive",
        status: "TODO" as const,
      })),
    );
  }

  return tasks.concat({
    id: "no-blockers",
    title: "No blockers",
    meta: "There are no pending tasks for this stage",
    status: "DONE",
  });
}

function TaskGroup(props: { title: string; items: readonly TaskItem[] }) {
  return (
    <ActivitySection title={props.title} count={props.items.length}>
      <ActivityListCard>
        <For each={props.items}>
          {(task) => (
            <ActivityListRow>
              <ActivityRowIcon>
                <Checkbox size={14} />
              </ActivityRowIcon>
              <ActivityRowBody>
                <ActivityRowTitle>{task.title}</ActivityRowTitle>
                <ActivityRowMeta>{task.meta}</ActivityRowMeta>
              </ActivityRowBody>
              <ActivityRowEnd>{task.status}</ActivityRowEnd>
            </ActivityListRow>
          )}
        </For>
      </ActivityListCard>
    </ActivitySection>
  );
}

export function TasksTabContent(props: { data: LeadDetailView }) {
  const { currentUser } = useAuthenticatedSession();

  const tasks = createMemo(() => {
    const isAssigned = currentUser().id === props.data.lead.executiveId;
    return deriveTasks(props.data, isAssigned);
  });
  const todoTasks = createMemo(() =>
    tasks().filter((t) => t.status === "TODO"),
  );
  const doneTasks = createMemo(() =>
    tasks().filter((t) => t.status === "DONE"),
  );

  return (
    <ActivityTabContainer>
      <Show
        when={tasks().length > 0}
        fallback={
          <ActivityTabEmptyState
            type="noTask"
            title="Mission accomplished!"
            subtitle="All tasks addressed. Maintain the momentum."
          />
        }
      >
        <Show when={todoTasks().length > 0}>
          <TaskGroup title="TODO" items={todoTasks()} />
        </Show>
        <Show when={doneTasks().length > 0}>
          <TaskGroup title="DONE" items={doneTasks()} />
        </Show>
      </Show>
    </ActivityTabContainer>
  );
}
