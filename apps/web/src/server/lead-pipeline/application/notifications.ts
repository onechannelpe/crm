import { createAppNotificationCenter } from "~/server/notifications/app-center-service";

import type { LeadDomainEvent } from "../domain/lead-event";

type AppNotificationCenter = ReturnType<typeof createAppNotificationCenter>;

export async function dispatchLeadNotifications(
  events: LeadDomainEvent[],
  center: AppNotificationCenter,
): Promise<void> {
  await Promise.all(
    events.map(async (event) => {
      if (event.type === "lead_needs_executive_input") {
        await center.notifyUsers([event.executiveId], {
          type: "lead.needs_executive_input",
          title: "Accion requerida",
          bodyText: `El lead RUC ${event.ruc} requiere tu informacion comercial`,
          actionUrl: `/leads/${event.leadId}/complete`,
          priority: "high",
          dedupeKey: `lead_nei_${event.leadId}`,
        });
        return;
      }

      if (event.type === "lead_ready_for_quotation") {
        await center.notifyBranchRoles(event.branchId, ["back_office"], {
          type: "lead.ready_for_quotation",
          title: "Lead listo para cotizacion",
          bodyText: `El lead RUC ${event.ruc} esta listo para cotizar`,
          actionUrl: `/quotations/${event.leadId}`,
          priority: "normal",
          dedupeKey: `lead_rfq_${event.leadId}`,
        });
        return;
      }

      if (event.type === "lead_ready_for_sale") {
        await center.notifyUsers([event.executiveId], {
          type: "lead.ready_for_sale",
          title: "Lead listo para venta",
          bodyText: `El lead RUC ${event.ruc} fue aprobado. Puedes registrar la venta.`,
          actionUrl: `/sales/new/${event.leadId}`,
          priority: "high",
          dedupeKey: `lead_rfs_${event.leadId}`,
        });
      }
    }),
  );
}
