import Plus from "~/components/icons/plus";
import {
  TimelineBody,
  TimelineEntry,
  TimelineIcon,
  TimelineMeta,
  TimelineMonth,
  TimelineSection,
  TimelineTitle,
} from "~/features/side-panel/components/timeline";

export function TimelineTabContent(props: {
  ruc?: string;
  engineStatus?: string;
}) {
  return (
    <TimelineSection>
      <TimelineMonth>Registro</TimelineMonth>
      <TimelineEntry>
        <TimelineIcon>
          <Plus size={12} />
        </TimelineIcon>
        <TimelineBody>
          <TimelineTitle>Borrador de lead abierto</TimelineTitle>
          <TimelineMeta>Listo para ingresar RUC</TimelineMeta>
        </TimelineBody>
      </TimelineEntry>
      <TimelineEntry>
        <TimelineIcon>
          <Plus size={12} />
        </TimelineIcon>
        <TimelineBody>
          <TimelineTitle>
            {props.ruc?.trim()
              ? `RUC preparado: ${props.ruc.trim()}`
              : "RUC pendiente"}
          </TimelineTitle>
          <TimelineMeta>
            {props.engineStatus ?? "Bootstrap desde Engine pendiente"}
          </TimelineMeta>
        </TimelineBody>
      </TimelineEntry>
    </TimelineSection>
  );
}
