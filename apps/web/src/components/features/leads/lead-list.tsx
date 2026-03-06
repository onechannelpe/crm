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
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import type { ExtensionExecutiveState } from "~/lib/extension/runtime";

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
  onSendToExtension?: (lead: LeadContact) => Promise<void> | void;
  extensionState?: ExtensionExecutiveState | null;
  extensionLoadingAssignmentId?: number | null;
  extensionEnabled?: boolean;
  emptyAction?: JSX.Element;
}

function badgeVariantForStatus(
  status: ExtensionExecutiveState["status"] | "unavailable",
) {
  switch (status) {
    case "active":
      return "success";
    case "dialing":
      return "warning";
    case "sync_error":
      return "destructive";
    case "sync_pending":
      return "info";
    case "ready":
    case "wrap_up":
      return "secondary";
    case "idle":
    case "unavailable":
      return "outline";
  }
}

function statusLabel(
  status: ExtensionExecutiveState["status"] | "unavailable",
): string {
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
    case "sync_pending":
      return "Pendiente";
    case "sync_error":
      return "Error sync";
    case "unavailable":
      return "Sin extension";
  }
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
                    <Show when={props.onSendToExtension}>
                      <Button
                        size="icon"
                        variant="primary"
                        disabled={
                          !props.extensionEnabled ||
                          !lead.phone_primary ||
                          props.extensionLoadingAssignmentId ===
                            lead.assignmentId
                        }
                        loading={
                          props.extensionLoadingAssignmentId ===
                          lead.assignmentId
                        }
                        onClick={() => void props.onSendToExtension?.(lead)}
                        aria-label="Enviar cliente a la extensión"
                      >
                        <Phone size={16} />
                      </Button>
                    </Show>
                    <Show
                      when={
                        props.extensionState?.assignmentId === lead.assignmentId
                      }
                    >
                      <Badge
                        variant={badgeVariantForStatus(
                          props.extensionState?.status ?? "unavailable",
                        )}
                      >
                        {statusLabel(
                          props.extensionState?.status ?? "unavailable",
                        )}
                      </Badge>
                    </Show>
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
