import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import type { CompiledLead } from "../compiler";

export async function persistCompanyRegistryRecords(
  db: Kysely<Database>,
  anchorMs: number,
  day: number,
  overlayTtl: number,
  leads: readonly CompiledLead[],
): Promise<void> {
  await db
    .insertInto("company_registry_record")
    .values(
      leads.map(({ spec }) => {
        const fetchedAt = new Date(anchorMs - spec.org.registryAgeDays * day);
        return {
          document_type: "ruc" as const,
          document_value: spec.org.ruc,
          full_name: null,
          legal_name: spec.org.legalName,
          address: spec.org.address,
          district: spec.org.district,
          department: spec.org.department,
          contributor_status: "ACTIVO",
          contributor_condition: "HABIDO",
          economic_activities_json: JSON.stringify([spec.org.activity]),
          payload_json: JSON.stringify({
            ruc: spec.org.ruc,
            legalName: spec.org.legalName,
            estado: "ACTIVO",
            condicion: "HABIDO",
          }),
          source: "sunat" as const,
          fetched_at: fetchedAt,
          expires_at: new Date(
            anchorMs - spec.org.registryAgeDays * day + overlayTtl,
          ),
          queue_state: "done" as const,
          claimable_at: fetchedAt,
          error_message: null,
          requested_by_user_id: null,
          requested_at: fetchedAt,
        };
      }),
    )
    .execute();
}
