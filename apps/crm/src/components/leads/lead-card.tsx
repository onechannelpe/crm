import { createSignal, Show } from "solid-js";
import { useAction, action, revalidate } from "@solidjs/router";
import { completeLead, logInteraction } from "~/lib/server/api";
import Button from "../shared/button";
import type { LeadAssignment } from "~/lib/shared/types";

const completeAction = action(async (assignmentId: number) => {
  "use server";
  await completeLead(assignmentId);
  revalidate("leads");
});

const logInteractionAction = action(
  async (contactId: number, outcome: string, notes?: string) => {
    "use server";
    await logInteraction(contactId, outcome, notes);
  },
);

interface LeadCardProps {
  assignment: LeadAssignment;
  onCreateSale: (contactId: number) => void;
}

export default function LeadCard(props: LeadCardProps) {
  const complete = useAction(completeAction);
  const logInt = useAction(logInteractionAction);

  const [showInteraction, setShowInteraction] = createSignal(false);
  const [outcome, setOutcome] = createSignal("");
  const [notes, setNotes] = createSignal("");

  const handleLogInteraction = async () => {
    if (!outcome()) return;
    await logInt(props.assignment.contact_id, outcome(), notes() || undefined);
    setShowInteraction(false);
    setOutcome("");
    setNotes("");
  };

  const contact = () => props.assignment.contact;
  const expiresIn = () => {
    const hours = Math.floor(
      (props.assignment.expires_at - Date.now()) / (1000 * 60 * 60),
    );
    return hours > 0 ? `${hours}h restantes` : "Expirado";
  };

  return (
    <div class="border border-gray-200 rounded-lg p-4 bg-white">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="font-semibold text-gray-900">
            {contact()?.name || "Contacto"}
          </h3>
          <p class="text-sm text-gray-500">{contact()?.org_name}</p>
        </div>
        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {expiresIn()}
        </span>
      </div>

      <div class="space-y-1 mb-4">
        {contact()?.dni && (
          <p class="text-sm">
            <span class="font-medium">DNI:</span> {contact()!.dni}
          </p>
        )}
        {contact()?.phone_primary && (
          <p class="text-sm">
            <span class="font-medium">Tel:</span> {contact()!.phone_primary}
          </p>
        )}
        {contact()?.org_ruc && (
          <p class="text-sm">
            <span class="font-medium">RUC:</span> {contact()!.org_ruc}
          </p>
        )}
      </div>

      <Show
        when={!showInteraction()}
        fallback={
          <div class="space-y-3 border-t pt-3">
            <select
              value={outcome()}
              onChange={(e) => setOutcome(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Seleccionar resultado</option>
              <option value="Interesado">Interesado</option>
              <option value="No interesado">No interesado</option>
              <option value="Llamar después">Llamar después</option>
              <option value="No contesta">No contesta</option>
            </select>
            <textarea
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              placeholder="Notas (opcional)"
              class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              rows="2"
            />
            <div class="flex gap-2">
              <Button
                size="sm"
                onClick={handleLogInteraction}
                disabled={!outcome()}
              >
                Guardar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowInteraction(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        }
      >
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => props.onCreateSale(props.assignment.contact_id)}
          >
            Crear venta
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowInteraction(true)}
          >
            Registrar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => complete(props.assignment.id)}
          >
            Completar
          </Button>
        </div>
      </Show>
    </div>
  );
}
