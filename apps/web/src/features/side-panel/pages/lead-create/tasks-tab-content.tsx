import Checkbox from "~/components/icons/checkbox";
import {
  TimelineBody,
  TimelineEntry,
  TimelineIcon,
  TimelineMeta,
  TimelineMonth,
  TimelineSection,
  TimelineTitle,
} from "~/features/side-panel/components/timeline";

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
    <TimelineSection>
      <TimelineMonth>Tasks</TimelineMonth>
      {tasks.map((task) => (
        <TimelineEntry>
          <TimelineIcon>
            <Checkbox size={12} />
          </TimelineIcon>
          <TimelineBody>
            <TimelineTitle>{task.title}</TimelineTitle>
            <TimelineMeta>{task.meta}</TimelineMeta>
          </TimelineBody>
        </TimelineEntry>
      ))}
    </TimelineSection>
  );
}
