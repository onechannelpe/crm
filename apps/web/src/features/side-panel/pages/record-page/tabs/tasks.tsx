import { createMemo, For, Show } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import type { LeadDetailView } from "~/contracts/workflow";
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
import {
  blockingTaskLabel,
  mapLeadActionsToUi,
} from "~/features/workflow/detail/actions/workflow-ui";

import type { TabContentProps } from "./content-props";

type TaskStatus = "TODO" | "DONE";

type TaskItem = {
  id: string;
  title: string;
  meta: string;
  status: TaskStatus;
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "PENDIENTE",
  DONE: "HECHO",
};

function deriveCreateTasks(props: {
  ruc?: string;
  engineStatus?: string;
  canCreate: boolean;
}): TaskItem[] {
  const rucIsValid = Boolean(props.ruc && /^\d{11}$/.test(props.ruc.trim()));
  const engineReady = props.engineStatus === "Datos encontrados";

  return [
    {
      id: "validate-ruc",
      title: "Validar RUC",
      meta: rucIsValid
        ? "Listo para registrar"
        : "Ingresa un RUC de 11 dígitos",
      status: rucIsValid ? "DONE" : "TODO",
    },
    {
      id: "engine-bootstrap",
      title: "Carga inicial",
      meta: props.engineStatus ?? "Pendiente",
      status: engineReady ? "DONE" : "TODO",
    },
    {
      id: "create-lead",
      title: "Crear prospecto",
      meta: props.canCreate
        ? "Se creará el prospecto en QUALIFYING"
        : "Bloqueado hasta validar el RUC",
      status: props.canCreate ? "DONE" : "TODO",
    },
    {
      id: "sunat-queue",
      title: "Encolar verificación SUNAT",
      meta: props.canCreate ? "En cola después de crear" : "Pendiente",
      status: props.canCreate ? "DONE" : "TODO",
    },
  ];
}

function deriveDetailTasks(
  data: LeadDetailView,
  isAssignedExecutive: boolean,
): TaskItem[] {
  const ownershipMeta = isAssignedExecutive
    ? "Asignado a ti"
    : "Asignado a otro ejecutivo";

  const tasks: TaskItem[] = [
    {
      id: "next-step",
      title: "Siguiente paso",
      meta: `${data.lead.nextStep} · ${ownershipMeta}`,
      status: "TODO",
    },
  ];

  if (data.blockingFields.length > 0) {
    return tasks.concat(
      data.blockingFields.map((field) => ({
        id: `blocking-${field}`,
        title: blockingTaskLabel(field),
        meta: "Requerido para avanzar",
        status: "TODO" as const,
      })),
    );
  }

  if (data.availableActions.length > 0) {
    const actionItems = mapLeadActionsToUi(data.availableActions);

    return tasks.concat(
      actionItems.map((action) => ({
        id: `action-${action.id}`,
        title: action.label,
        meta: isAssignedExecutive
          ? "Disponible ahora"
          : "Solo lectura: acción disponible para el ejecutivo asignado",
        status: "TODO" as const,
      })),
    );
  }

  return tasks.concat({
    id: "no-blockers",
    title: "Sin bloqueos",
    meta: "No hay tareas pendientes para esta etapa",
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
              <ActivityRowEnd>{TASK_STATUS_LABEL[task.status]}</ActivityRowEnd>
            </ActivityListRow>
          )}
        </For>
      </ActivityListCard>
    </ActivitySection>
  );
}

export function TasksTab(props: TabContentProps) {
  const { currentUser } = useAuthenticatedSession();

  const tasks = createMemo(() => {
    if (props.mode === "create") {
      return deriveCreateTasks({
        ruc: props.ruc,
        engineStatus: props.engineStatus,
        canCreate: props.canCreate,
      });
    }

    const isAssigned = currentUser().id === props.data.lead.executiveId;
    return deriveDetailTasks(props.data, isAssigned);
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
            title="Misión cumplida"
            subtitle="Todas las tareas fueron atendidas. Mantén el impulso."
          />
        }
      >
        <Show when={todoTasks().length > 0}>
          <TaskGroup title={TASK_STATUS_LABEL.TODO} items={todoTasks()} />
        </Show>
        <Show when={doneTasks().length > 0}>
          <TaskGroup title={TASK_STATUS_LABEL.DONE} items={doneTasks()} />
        </Show>
      </Show>
    </ActivityTabContainer>
  );
}
