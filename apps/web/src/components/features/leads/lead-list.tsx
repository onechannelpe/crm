import { type Component, For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";
import Check from "~/components/icons/check";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface LeadContact {
  assignmentId: number;
  contactId: number;
  name: string;
  dni: string;
  phone_primary: string | null;
  organization_id: number;
  assigned_at: number;
  expires_at: number;
  status: string;
}

interface LeadListProps {
  contacts: LeadContact[];
  onCreateSale: (contactId: number) => void;
  onComplete: (assignmentId: number) => void;
}

function formatTimeLeft(expiresAt: number): string {
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor(
    (remainingMs % (60 * 60 * 1000)) / (60 * 1000),
  );
  if (remainingHours <= 0 && remainingMinutes <= 0) return "Vencido";
  if (remainingHours <= 0) return `${remainingMinutes}m restantes`;
  return `${remainingHours}h ${remainingMinutes}m restantes`;
}

export const LeadList: Component<LeadListProps> = (props) => {
  return (
    <Show
      when={props.contacts.length > 0}
      fallback={
        <EmptyState
          title="Sin leads activos"
          description="Solicita nuevos leads para comenzar a trabajar."
        />
      }
    >
      <div class="space-y-3">
        <For each={props.contacts}>
          {(lead) => (
            <div class="crm-surface rounded-3xl px-4 py-4 md:px-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="grid flex-1 gap-2 md:grid-cols-[1.2fr_1fr_1fr] md:items-center">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User class="h-4 w-4" />
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-foreground">
                          {lead.name}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          DNI {lead.dni}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone class="h-3.5 w-3.5" />
                    <span>{lead.phone_primary || "Sin teléfono"}</span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" class="gap-1">
                      <Building2 class="h-3 w-3" />
                      Org #{lead.organization_id}
                    </Badge>
                    <Badge
                      variant={lead.status === "active" ? "success" : "outline"}
                    >
                      {lead.status === "active" ? "Activo" : lead.status}
                    </Badge>
                    <Badge
                      variant={
                        lead.expires_at < Date.now() ? "destructive" : "warning"
                      }
                    >
                      {formatTimeLeft(lead.expires_at)}
                    </Badge>
                  </div>
                </div>

                <div class="flex items-center gap-2 lg:pl-4">
                  <Button
                    size="sm"
                    onClick={() => props.onCreateSale(lead.contactId)}
                  >
                    Crear venta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => props.onComplete(lead.assignmentId)}
                  >
                    <Check class="h-3.5 w-3.5" />
                    Completar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};
