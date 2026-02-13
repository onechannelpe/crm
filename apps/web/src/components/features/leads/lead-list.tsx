import { type Component, For, Show } from "solid-js";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/feedback/empty-state";
import { Phone, Building2, User, Check } from "lucide-solid";

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
            <div class="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contacto</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Organización</TableHead>
                            <TableHead class="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <For each={props.contacts}>
                            {(lead) => (
                                <TableRow>
                                    <TableCell class="font-medium">
                                        <div class="flex items-center gap-2">
                                            <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User class="h-4 w-4" />
                                            </div>
                                            <span>{lead.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{lead.dni}</TableCell>
                                    <TableCell>
                                        <div class="flex items-center gap-2 text-muted-foreground">
                                            <Phone class="h-3 w-3" />
                                            <span>{lead.phone_primary || "—"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" class="gap-1">
                                            <Building2 class="h-3 w-3" />
                                            Org #{lead.organization_id}
                                        </Badge>
                                    </TableCell>
                                    <TableCell class="text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => props.onCreateSale(lead.contactId)}
                                            >
                                                Crear Venta
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => props.onComplete(lead.assignmentId)}
                                            >
                                                <Check class="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </For>
                    </TableBody>
                </Table>
            </div>
        </Show>
    );
};
