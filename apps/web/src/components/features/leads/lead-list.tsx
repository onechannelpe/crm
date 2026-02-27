import {
  type Component,
  type JSX,
  createMemo,
  createSignal,
  For,
  Show,
} from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";
import Check from "~/components/icons/check";
import ChevronDown from "~/components/icons/chevron-down";
import ChevronUp from "~/components/icons/chevron-up";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";

import { RegisterCallDialog } from "./register-call-dialog";

import styles from "./lead-list.module.css";

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
  onRegisterCall: (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes: string,
  ) => Promise<void> | void;
  emptyAction?: JSX.Element;
}

export const LeadList: Component<LeadListProps> = (props) => {
  const [registerActive, setRegisterActive] = createSignal<{
    assignmentId: number;
    contactId: number;
  } | null>(null);

  // Sorting state: field is implicitly 'organization_id'. Only asc/desc toggles.
  const [sortAsc, setSortAsc] = createSignal(true);

  const sortedContacts = createMemo(() => {
    const list = [...props.contacts];
    return list.sort((a, b) => {
      const valA = a.organization_id;
      const valB = b.organization_id;
      if (valA < valB) return sortAsc() ? -1 : 1;
      if (valA > valB) return sortAsc() ? 1 : -1;
      return 0;
    });
  });

  return (
    <Show
      when={props.contacts.length > 0}
      fallback={
        <EmptyState
          title="Sin clientes activos"
          description="Solicita nuevos clientes para llenar la cola."
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente ({props.contacts.length})</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead
              onClick={() => setSortAsc((prev) => !prev)}
              style={{ cursor: "pointer", "user-select": "none" }}
            >
              <div
                style={{ display: "flex", "align-items": "center", gap: "4px" }}
              >
                Organización
                {sortAsc() ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </div>
            </TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={sortedContacts()}>
            {(lead) => (
              <TableRow>
                <TableCell class={styles.leadCell}>
                  <div class={styles.leadIdentity}>
                    <span class={styles.avatar}>
                      <User size={14} />
                    </span>
                    <div class={styles.leadInfo}>
                      <p class={styles.leadName}>{lead.name}</p>
                      <p class={styles.leadMeta}>DNI {lead.dni}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div class={styles.inlineInfo}>
                    <Phone size={14} />
                    <span>{lead.phone_primary || "Sin teléfono"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class={styles.inlineInfo}>
                    <Building2 size={14} />
                    <span>Org #{lead.organization_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class={styles.actions}>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() =>
                        setRegisterActive({
                          assignmentId: lead.assignmentId,
                          contactId: lead.contactId,
                        })
                      }
                      aria-label="Registrar llamada"
                    >
                      <Check size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>

      <RegisterCallDialog
        isOpen={!!registerActive()}
        onClose={() => setRegisterActive(null)}
        onSubmit={(outcome, notes) => {
          const active = registerActive();
          if (active) {
            void props.onRegisterCall(
              active.assignmentId,
              active.contactId,
              outcome,
              notes,
            );
            setRegisterActive(null);
          }
        }}
      />
    </Show>
  );
};
