import { Show } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import CircleCheckBig from "~/components/icons/circle-check-big";
import { Tag } from "~/components/ui/tag/tag";
import type { RecordContext } from "~/features/record-show/model/record-context";
import {
  leadTaskOwnerLabel,
  resolveLeadTask,
  type LeadTask,
} from "~/features/record-show/workflow/next-action";

import styles from "./tareas.module.css";

export function TareasTab(props: { context: RecordContext }) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => {
        const task = resolveLeadTask(data);
        return (
          <div class={styles.container}>
            <Show when={task} fallback={<EmptyTasks />} keyed>
              {(current) => <TaskRow task={current} />}
            </Show>
          </div>
        );
      }}
    </Show>
  );
}

function TaskRow(props: { task: LeadTask }) {
  return (
    <div class={styles.task}>
      <span class={styles.status}>
        <Checkbox size={16} />
      </span>
      <div class={styles.body}>
        <span class={styles.label}>{props.task.label}</span>
        <div class={styles.meta}>
          <Tag
            color={props.task.isYourMove ? "green" : "neutral"}
            text={leadTaskOwnerLabel(props.task.owner)}
            preventShrink
          />
          <span
            class={
              props.task.isYourMove ? styles.statusMine : styles.statusText
            }
          >
            {props.task.isYourMove
              ? "Tu turno"
              : `Esperando a ${leadTaskOwnerLabel(props.task.owner)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyTasks() {
  return (
    <div class={styles.empty}>
      <CircleCheckBig size={20} />
      <span>No hay tareas pendientes.</span>
    </div>
  );
}
