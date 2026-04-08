import Plus from "~/components/icons/plus";

import styles from "../page.module.css";

export function TimelineTabContent(props: {
  ruc?: string;
  engineStatus?: string;
}) {
  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>Registro</div>
      <div class={styles.timelineEntry}>
        <div class={styles.timelineIcon}>
          <Plus size={12} />
        </div>
        <div class={styles.timelineBody}>
          <div class={styles.timelineTitle}>Borrador de lead abierto</div>
          <div class={styles.timelineMeta}>Listo para ingresar RUC</div>
        </div>
      </div>
      <div class={styles.timelineEntry}>
        <div class={styles.timelineIcon}>
          <Plus size={12} />
        </div>
        <div class={styles.timelineBody}>
          <div class={styles.timelineTitle}>
            {props.ruc?.trim()
              ? `RUC preparado: ${props.ruc.trim()}`
              : "RUC pendiente"}
          </div>
          <div class={styles.timelineMeta}>
            {props.engineStatus ?? "Bootstrap desde Engine pendiente"}
          </div>
        </div>
      </div>
    </div>
  );
}
