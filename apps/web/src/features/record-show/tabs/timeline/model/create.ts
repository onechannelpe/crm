import type { Group } from "./group";
import { groupEventsByMonth } from "./group";

// `openedAt` keeps the synthetic timeline stable across memo recomputations.
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
      createdAt: props.openedAt - 1_000, // Keep this before the open event.
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
