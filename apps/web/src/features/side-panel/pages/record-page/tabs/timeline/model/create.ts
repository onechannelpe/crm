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
      author: "You",
      action: "opened lead draft",
      subject: props.ruc?.trim() ? `RUC ${props.ruc.trim()}` : "Draft opened",
      description: props.engineStatus ?? "Engine bootstrap pending",
      kind: "system" as const,
    },
    {
      id: "create-ruc-state",
      createdAt: Date.now() - 1_000,
      name: "lead.updated",
      author: "System",
      action: "prepared registration checks",
      subject: "Validation pipeline",
      description: props.ruc?.trim()
        ? "RUC captured and ready for submit"
        : "Waiting for an 11-digit RUC",
      kind: "system" as const,
    },
  ]);
}
