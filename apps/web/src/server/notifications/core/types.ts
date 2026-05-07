export type AudienceKind =
  | "user_ids"
  | "branch_roles"
  | "global_roles"
  | "team";
export type Channel = "in_app" | "email" | "whatsapp";

export type DomainEvent = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload_json: string;
  occurred_at: number;
};

export type NotificationIntent = {
  intentId: string;
  sourceEventId: string;
  eventType: string;
  audienceKind: AudienceKind;
  targets: NotificationIntentTarget[];
  channels: Channel[];
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
};

export type NotificationIntentTarget =
  | {
      targetKind: "user_id";
      userId: number;
    }
  | {
      targetKind: "branch_role";
      branchId: number;
      role: string;
    }
  | {
      targetKind: "global_role";
      role: string;
    }
  | {
      targetKind: "team_id";
      teamId: number;
    };
