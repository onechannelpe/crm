import { type Component, Show } from "solid-js";

import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";

interface LeadContact {
  id: number;
  name: string;
  dni: string;
  phone_primary: string | null;
  organization_id: number | null;
}

interface LeadCardProps {
  contact: LeadContact;
  onCreateSale: (contactId: number) => void;
  onComplete: (contactId: number) => void;
}

const LEAD_EXPIRY_TEXT = "24h restantes";

export const LeadCard: Component<LeadCardProps> = (props) => {
  return (
    <div class="crm-surface rounded-2xl border border-border/85 p-4 transition-shadow hover:shadow-elevation-2">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-semibold text-foreground">{props.contact.name}</h3>
          <Show when={props.contact.organization_id}>
            <p class="text-sm text-muted-foreground">
              Org: {props.contact.organization_id}
            </p>
          </Show>
        </div>
        <Badge variant="warning">{LEAD_EXPIRY_TEXT}</Badge>
      </div>

      <div class="space-y-1 mb-4">
        <p class="text-sm">
          <span class="font-medium text-muted-foreground">DNI:</span>{" "}
          <span class="text-foreground">{props.contact.dni}</span>
        </p>
        <Show when={props.contact.phone_primary}>
          <p class="text-sm">
            <span class="font-medium text-muted-foreground">Tel:</span>{" "}
            <span class="text-foreground">{props.contact.phone_primary}</span>
          </p>
        </Show>
      </div>

      <div class="flex gap-2">
        <Button size="sm" onClick={() => props.onCreateSale(props.contact.id)}>
          Crear venta
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => props.onComplete(props.contact.id)}
        >
          Completar
        </Button>
      </div>
    </div>
  );
};
