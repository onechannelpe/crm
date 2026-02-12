import { type Component, For, Show } from "solid-js";
import { LeadCard } from "./lead-card";
import { EmptyState } from "~/presentation/ui/feedback/empty-state";
import type { Contact } from "~/infrastructure/db/schema";

interface LeadListProps {
  contacts: Contact[];
  onCreateSale: (contactId: number) => void;
  onComplete: (contactId: number) => void;
}

export const LeadList: Component<LeadListProps> = (props) => {
  return (
    <Show
      when={props.contacts.length > 0}
      fallback={
        <EmptyState
          title="No hay leads asignados"
          description="Solicita nuevos leads para comenzar a trabajar"
        />
      }
    >
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <For each={props.contacts}>
          {(contact) => (
            <LeadCard
              contact={contact}
              onCreateSale={props.onCreateSale}
              onComplete={props.onComplete}
            />
          )}
        </For>
      </div>
    </Show>
  );
};
