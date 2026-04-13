import Checkbox from "~/components/icons/checkbox";

import styles from "../page.module.css";

export function TasksTabContent(props: {
  ruc?: string;
  engineStatus?: string;
  canCreate: boolean;
}) {
  const tasks = [
    {
      title: "Validar RUC",
      meta:
        props.ruc && /^\d{11}$/.test(props.ruc.trim())
          ? "Listo para registrar"
          : "Ingresa un RUC de 11 dígitos",
    },
    {
      title: "Bootstrap desde Engine",
      meta: props.engineStatus ?? "",
    },
    {
      title: "Crear lead",
      meta: props.canCreate
        ? "Creará el lead en PENDING_EXTERNAL_REVIEW"
        : "Bloqueado hasta validar el RUC",
    },
    {
      title: "Encolar verificación SUNAT",
      meta: props.canCreate ? "Se encola después del registro" : "Pendiente",
    },
  ];

  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>Tasks</div>
      {tasks.map((task) => (
        <div class={styles.timelineEntry}>
          <div class={styles.timelineIcon}>
            <Checkbox size={12} />
          </div>
          <div class={styles.timelineBody}>
            <div class={styles.timelineTitle}>{task.title}</div>
            <div class={styles.timelineMeta}>{task.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
