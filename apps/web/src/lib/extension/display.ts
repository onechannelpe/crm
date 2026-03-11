import type {
  ExtensionExecutivePresenceStatus,
  ExtensionSyncHealth,
} from "./runtime";

type PresenceStatus =
  | ExtensionExecutivePresenceStatus
  | "unavailable"
  | undefined;
type SyncHealth = ExtensionSyncHealth | "unavailable" | undefined;

export function badgeVariantForPresence(status: PresenceStatus) {
  switch (status) {
    case "active":
      return "success" as const;
    case "dialing":
      return "warning" as const;
    case "ready":
    case "wrap_up":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function badgeVariantForSyncHealth(status: SyncHealth) {
  switch (status) {
    case "ok":
      return "outline" as const;
    case "pending":
      return "info" as const;
    case "error":
    case "reauth_required":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case "idle":
      return "Sin handoff";
    case "ready":
      return "Listo";
    case "dialing":
      return "Marcando";
    case "active":
      return "En llamada";
    case "wrap_up":
      return "Cierre";
    default:
      return "Sin extensión";
  }
}

export function syncHealthLabel(status: SyncHealth): string {
  switch (status) {
    case "ok":
      return "Sync OK";
    case "pending":
      return "Pendiente";
    case "error":
      return "Error sync";
    case "reauth_required":
      return "Reconectar";
    default:
      return "Sin extensión";
  }
}
