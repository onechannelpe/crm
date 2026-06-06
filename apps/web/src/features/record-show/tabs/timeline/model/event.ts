import { type LeadTimelineItem } from "~/contracts/workflow/views";

export type Event = {
  id: string;
  createdAt: number;
  name: string;
  author: string;
  action: string;
  subject: string;
  description?: string;
  kind: LeadTimelineItem["kind"];
};

export function normalizeLeadEvent(item: LeadTimelineItem): Event {
  if (item.kind === "note") {
    return {
      id: item.id,
      createdAt: item.occurredAt,
      name: "linked-note.created",
      author: item.actorDisplayName,
      action: "creó una nota relacionada",
      subject: item.title,
      description: item.description,
      kind: item.kind,
    };
  }

  if (item.kind === "call") {
    return {
      id: item.id,
      createdAt: item.occurredAt,
      name: "linked-task.created",
      author: item.actorDisplayName,
      action: "creó una tarea relacionada",
      subject: item.title,
      description: item.description,
      kind: item.kind,
    };
  }

  if (item.kind === "assignment") {
    return {
      id: item.id,
      createdAt: item.occurredAt,
      name: "lead.updated",
      author: item.actorDisplayName,
      action: "actualizó la asignación",
      subject: item.title,
      description: item.description,
      kind: item.kind,
    };
  }

  if (item.kind === "stage-change") {
    return {
      id: item.id,
      createdAt: item.occurredAt,
      name: "lead.updated",
      author: item.actorDisplayName,
      action: "cambió de etapa",
      subject: item.title,
      description: item.description,
      kind: item.kind,
    };
  }

  return {
    id: item.id,
    createdAt: item.occurredAt,
    name: "lead.updated",
    author: item.actorDisplayName,
    action: "actualizó el registro",
    subject: item.title,
    description: item.description,
    kind: item.kind,
  };
}

export function isLinkedEvent(event: Event): boolean {
  return (
    event.name.startsWith("linked-note") || event.name.startsWith("linked-task")
  );
}
