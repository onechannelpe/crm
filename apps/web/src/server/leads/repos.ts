import type { Kysely } from "kysely";

import type {
  Estado,
  LeadStage,
  Prioridad,
  Database,
  NewLead,
  NewLeadPipelineAssignment,
  NewLeadCommercialInput,
} from "~/lib/db/types";

export function createLeadsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewLead): Promise<number> {
      const result = await db
        .insertInto("crm_leads")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("crm_leads")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByRuc(ruc: string) {
      return db
        .selectFrom("crm_leads")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
    },

    async updateStage(id: number, stage: LeadStage): Promise<void> {
      await db
        .updateTable("crm_leads")
        .set({ stage, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    async updateEstado(id: number, estado: Estado): Promise<void> {
      await db
        .updateTable("crm_leads")
        .set({ estado, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    async updatePrioridad(id: number, prioridad: Prioridad): Promise<void> {
      await db
        .updateTable("crm_leads")
        .set({ prioridad, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    list(filters: {
      executiveId?: number;
      stage?: LeadStage;
      estado?: Estado;
      prioridad?: Prioridad;
      fromDate?: number;
      toDate?: number;
      limit: number;
      offset: number;
    }) {
      let query = db.selectFrom("crm_leads").selectAll();
      if (filters.executiveId !== undefined) {
        query = query.where("executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined) {
        query = query.where("stage", "=", filters.stage);
      }
      if (filters.estado !== undefined) {
        query = query.where("estado", "=", filters.estado);
      }
      if (filters.prioridad !== undefined) {
        query = query.where("prioridad", "=", filters.prioridad);
      }
      if (filters.fromDate !== undefined) {
        query = query.where("created_at", ">=", filters.fromDate);
      }
      if (filters.toDate !== undefined) {
        query = query.where("created_at", "<=", filters.toDate);
      }
      return query
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();
    },

    findByRucInList(rucs: string[]) {
      if (rucs.length === 0) return Promise.resolve([]);
      return db
        .selectFrom("crm_leads")
        .select(["id", "ruc", "estado", "prioridad", "stage"])
        .where("ruc", "in", rucs)
        .execute();
    },

    async updateEstadoByRuc(ruc: string, estado: Estado): Promise<boolean> {
      const result = await db
        .updateTable("crm_leads")
        .set({ estado, updated_at: Date.now() })
        .where("ruc", "=", ruc)
        .executeTakeFirst();
      return Number(result.numUpdatedRows) > 0;
    },

    async updateExecutiveId(
      leadId: number,
      executiveId: number,
    ): Promise<void> {
      await db
        .updateTable("crm_leads")
        .set({ executive_id: executiveId, updated_at: Date.now() })
        .where("id", "=", leadId)
        .execute();
    },

    async updatePrioridadByRuc(
      ruc: string,
      prioridad: Prioridad,
    ): Promise<boolean> {
      const result = await db
        .updateTable("crm_leads")
        .set({ prioridad, updated_at: Date.now() })
        .where("ruc", "=", ruc)
        .executeTakeFirst();
      return Number(result.numUpdatedRows) > 0;
    },

    listForExport(filters: {
      fromDate?: number;
      toDate?: number;
      executiveId?: number;
    }) {
      let query = db
        .selectFrom("crm_leads as l")
        .innerJoin("users as u", "u.id", "l.executive_id")
        .select([
          "l.ruc",
          "l.razon_social",
          "l.address",
          "l.stage",
          "l.estado",
          "l.prioridad",
          "l.created_at",
          "l.executive_id",
          "u.names as executive_name",
        ]);
      if (filters.fromDate !== undefined) {
        query = query.where("l.created_at", ">=", filters.fromDate);
      }
      if (filters.toDate !== undefined) {
        query = query.where("l.created_at", "<=", filters.toDate);
      }
      if (filters.executiveId !== undefined) {
        query = query.where("l.executive_id", "=", filters.executiveId);
      }
      return query.orderBy("l.created_at", "desc").execute();
    },
  };
}

export function createLeadPipelineAssignmentsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewLeadPipelineAssignment): Promise<number> {
      const result = await db
        .insertInto("crm_lead_assignments")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findActiveByLead(leadId: number) {
      return db
        .selectFrom("crm_lead_assignments")
        .selectAll()
        .where("lead_id", "=", leadId)
        .where("is_active", "=", 1)
        .executeTakeFirst();
    },

    async deactivateForLead(leadId: number): Promise<void> {
      await db
        .updateTable("crm_lead_assignments")
        .set({ is_active: 0 })
        .where("lead_id", "=", leadId)
        .where("is_active", "=", 1)
        .execute();
    },

    listByLead(leadId: number) {
      return db
        .selectFrom("crm_lead_assignments")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("assigned_at", "desc")
        .execute();
    },
  };
}

export function createLeadCommercialInputsRepo(db: Kysely<Database>) {
  return {
    async upsert(values: NewLeadCommercialInput): Promise<void> {
      await db
        .insertInto("crm_lead_commercial_inputs")
        .values(values)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedor_actual ?? null,
            tasa_actual: values.tasa_actual ?? null,
            gpv: values.gpv ?? null,
            ticket: values.ticket ?? null,
            abono: values.abono ?? null,
            cantidad_pos: values.cantidad_pos ?? null,
            updated_at: values.updated_at,
            updated_by: values.updated_by,
          }),
        )
        .execute();
    },

    findByLeadId(leadId: number) {
      return db
        .selectFrom("crm_lead_commercial_inputs")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
    },
  };
}
