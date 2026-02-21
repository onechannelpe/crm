import { type Component, For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";
import Check from "~/components/icons/check";
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
  onCreateSale: (contactId: number) => void;
  onComplete: (assignmentId: number) => void;
}

function formatTimeLeft(expiresAt: number): string {
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor(
    (remainingMs % (60 * 60 * 1000)) / (60 * 1000),
  );
  if (remainingHours <= 0 && remainingMinutes <= 0) return "Expired";
  if (remainingHours <= 0) return `${remainingMinutes}m left`;
  return `${remainingHours}h ${remainingMinutes}m left`;
}

export const LeadList: Component<LeadListProps> = (props) => {
  return (
    <Show
      when={props.contacts.length > 0}
      fallback={
        <EmptyState
          title="No active leads"
          description="Request new leads to fill the queue."
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead class={styles.actionsHead}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={props.contacts}>
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
                    <span>{lead.phone_primary || "No phone"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class={styles.inlineInfo}>
                    <Building2 size={14} />
                    <span>Org #{lead.organization_id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={lead.status === "active" ? "success" : "outline"}
                  >
                    {lead.status === "active" ? "Active" : lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      lead.expires_at < Date.now() ? "destructive" : "warning"
                    }
                  >
                    {formatTimeLeft(lead.expires_at)}
                  </Badge>
                </TableCell>
                <TableCell class={styles.actionsCell}>
                  <div class={styles.actions}>
                    <Button
                      size="sm"
                      onClick={() => props.onCreateSale(lead.contactId)}
                    >
                      Create sale
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => props.onComplete(lead.assignmentId)}
                    >
                      <Check size={14} />
                      Complete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </Show>
  );
};
