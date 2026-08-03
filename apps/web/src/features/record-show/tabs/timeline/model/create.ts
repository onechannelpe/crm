import type { Group } from "./group";
import { groupEventsByMonth } from "./group";

// The draft has no persisted timeline yet, so these two entries stand in for it.
// `openedAt` comes from the caller rather than a clock read here: this runs
// inside a memo, and a fresh read would make the placeholder timestamps drift
// on every recompute.
export function buildCreateGroups(props: {
  ruc?: string;
  engineStatus?: string;
  openedAt: number;
}): Group[] {
  return groupEventsByMonth([
    {
      id: "create-open",
      createdAt: props.openedAt,
      name: "lead.created",
      author: "Tú",
      action: "abrió el borrador del cliente",
      subject: props.ruc?.trim()
        ? `RUC ${props.ruc.trim()}`
        : "Borrador abierto",
      description: props.engineStatus ?? "Carga inicial pendiente",
      kind: "system" as const,
    },
    {
      id: "create-ruc-state",
      // Ordered just before the open event, which the list sorts on.
      createdAt: props.openedAt - 1_000,
      name: "lead.updated",
      author: "Sistema",
      action: "preparó las validaciones de registro",
      subject: "Flujo de validación",
      description: props.ruc?.trim()
        ? "RUC registrado y listo para enviar"
        : "Esperando un RUC de 11 dígitos",
      kind: "system" as const,
    },
  ]);
}
