import { For } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityListCard,
  ActivityListRow,
  ActivityRowBody,
  ActivityRowIcon,
  ActivityRowMeta,
  ActivityRowTitle,
  ActivitySection,
  ActivityTabContainer,
} from "~/features/side-panel/components/activity-tabs/primitives";

import contentStyles from "../../components/activity-tabs/content.module.css";

type DraftTaskItem = {
  id: string;
  title: string;
  meta: string;
  status: "TODO" | "DONE";
};

function deriveDraftTasks(props: {
  ruc?: string;
  engineStatus?: string;
  canCreate: boolean;
}): DraftTaskItem[] {
  const rucIsValid = Boolean(props.ruc && /^\d{11}$/.test(props.ruc.trim()));
  const engineReady = props.engineStatus === "Datos encontrados";

  return [
    {
      id: "validate-ruc",
      title: "Validate RUC",
      meta: rucIsValid ? "Ready to register" : "Enter an 11-digit RUC",
      status: rucIsValid ? "DONE" : "TODO",
    },
    {
      id: "engine-bootstrap",
      title: "Bootstrap from Engine",
      meta: props.engineStatus ?? "Pending",
      status: engineReady ? "DONE" : "TODO",
    },
    {
      id: "create-lead",
      title: "Create lead",
      meta: props.canCreate
        ? "Will create lead in PENDING_EXTERNAL_REVIEW"
        : "Blocked until RUC is valid",
      status: props.canCreate ? "DONE" : "TODO",
    },
    {
      id: "sunat-queue",
      title: "Queue SUNAT verification",
      meta: props.canCreate ? "Queued after creation" : "Pending",
      status: props.canCreate ? "DONE" : "TODO",
    },
  ];
}

export function TasksTabContent(props: {
  ruc?: string;
  engineStatus?: string;
  canCreate: boolean;
}) {
  const tasks = deriveDraftTasks(props);

  if (tasks.length === 0) {
    return (
      <ActivityTabContainer>
        <ActivityTabEmptyState
          type="noTask"
          title="Mission accomplished!"
          subtitle="All tasks addressed. Maintain the momentum."
        />
      </ActivityTabContainer>
    );
  }

  return (
    <ActivityTabContainer>
      <ActivitySection title="All" count={tasks.length}>
        <ActivityListCard>
          <For each={tasks}>
            {(task) => (
              <ActivityListRow>
                <ActivityRowIcon>
                  <Checkbox size={14} />
                </ActivityRowIcon>
                <ActivityRowBody>
                  <ActivityRowTitle>{task.title}</ActivityRowTitle>
                  <ActivityRowMeta>{task.meta}</ActivityRowMeta>
                </ActivityRowBody>
                <div class={contentStyles.taskRightMeta}>{task.status}</div>
              </ActivityListRow>
            )}
          </For>
        </ActivityListCard>
      </ActivitySection>
    </ActivityTabContainer>
  );
}
