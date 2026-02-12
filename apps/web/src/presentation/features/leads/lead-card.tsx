import { type Component, Show } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { Badge } from "~/presentation/ui/primitives/badge";
import type { Contact } from "~/infrastructure/db/schema";

interface LeadCardProps {
  contact: Contact;
  onCreateSale: (contactId: number) => void;
  onComplete: (contactId: number) => void;
}

export const LeadCard: Component<LeadCardProps> = (props) => {
  const expiresText = () => {
    return "24h restantes";
  };

  return (
    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900">{props.contact.name}</h3>
          <Show when={props.contact.organization_id}>
            <p class="text-sm text-gray-500">RUC: {props.contact.organization_id}</p>
          </Show>
        </div>
        <Badge variant="warning">{expiresText()}</Badge>
      </div>

      <div class="space-y-1 mb-4">
        <p class="text-sm">
          <span class="font-medium text-gray-700">DNI:</span>{" "}
          <span class="text-gray-900">{props.contact.dni}</span>
        </p>
        <Show when={props.contact.phone_primary}>
          <p class="text-sm">
            <span class="font-medium text-gray-700">Tel:</span>{" "}
            <span class="text-gray-900">{props.contact.phone_primary}</span>
          </p>
        </Show>
      </div>

      <div class="flex gap-2">
        <Button
          size="sm"
          onClick={() => props.onCreateSale(props.contact.id)}
        >
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
