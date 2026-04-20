import type { Group } from "./group";
import { groupEventsByMonth } from "./group";

export function buildCreateGroups(props: {
  ruc?: string;
  engineStatus?: string;
}): Group[] {
  return groupEventsByMonth([
    {
      id: "create-open",
      createdAt: Date.now(),
      name: "lead.created",
      author: "Tú",
      action: "abrió el borrador del prospecto",
      subject: props.ruc?.trim()
        ? `RUC ${props.ruc.trim()}`
        : "Borrador abierto",
      description: props.engineStatus ?? "Carga inicial pendiente",
      kind: "system" as const,
    },
    {
      id: "create-ruc-state",
      createdAt: Date.now() - 1_000,
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
