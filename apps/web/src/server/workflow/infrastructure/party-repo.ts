import { randomUUIDv7 } from "bun";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  LegalRepresentative,
  OrganizationProfile,
  PartyRepository,
} from "~/server/workflow/application/ports/party-repository";

function toOrganizationProfile(row: {
  id: string;
  ruc: string;
  name: string;
  giro_negocio: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
}): OrganizationProfile {
  return {
    id: row.id,
    ruc: row.ruc,
    name: row.name,
    giroNegocio: row.giro_negocio,
    address: row.address,
    district: row.district,
    province: row.province,
    department: row.department,
    phone: row.phone,
    email: row.email,
  };
}

export function createPartyRepo(db: DatabaseExecutor): PartyRepository {
  return {
    async findOrganizationByRuc(ruc) {
      const row = await db
        .selectFrom("organizations")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
      return row ? toOrganizationProfile(row) : undefined;
    },
    async findOrganizationById(id) {
      const row = await db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? toOrganizationProfile(row) : undefined;
    },
    async createOrganization(values) {
      const id = randomUUIDv7();
      await db
        .insertInto("organizations")
        .values({
          id,
          ruc: values.ruc,
          name: values.name,
          address: values.address,
          district: values.district,
          department: values.department,
          created_at: Date.now(),
        })
        .executeTakeFirstOrThrow();
      const created = await db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      return toOrganizationProfile(created);
    },
    async updateOrganizationCommercial(values) {
      await db
        .updateTable("organizations")
        .set({
          giro_negocio: values.giroNegocio,
        })
        .where("id", "=", values.organizationId)
        .execute();
    },
    async updateOrganizationFromEnrichment(values) {
      await db
        .updateTable("organizations")
        .set({
          name: values.name,
          address: values.address,
          district: values.district,
          department: values.department,
        })
        .where("id", "=", values.organizationId)
        .execute();
    },
    async upsertPrimaryLegalRepresentative(values: LegalRepresentative) {
      const now = Date.now();
      await db
        .insertInto("organization_people")
        .values({
          organization_id: values.organizationId,
          dni: values.dni,
          nombres: values.nombres,
          apellido_paterno: values.apellidoPaterno,
          apellido_materno: values.apellidoMaterno,
          telefono: values.telefono,
          email: values.email,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.columns(["organization_id", "dni"]).doUpdateSet({
            nombres: values.nombres,
            apellido_paterno: values.apellidoPaterno,
            apellido_materno: values.apellidoMaterno,
            telefono: values.telefono,
            email: values.email,
            updated_at: now,
          }),
        )
        .executeTakeFirstOrThrow();

      const person = await db
        .selectFrom("organization_people")
        .select("id")
        .where("organization_id", "=", values.organizationId)
        .where("dni", "=", values.dni)
        .executeTakeFirstOrThrow();

      await db
        .updateTable("organization_person_roles")
        .set({ effective_to: now, is_primary: 0 })
        .where("role", "=", "LEGAL_REPRESENTATIVE")
        .where("is_primary", "=", 1)
        .where("organization_person_id", "in", (eb) =>
          eb
            .selectFrom("organization_people")
            .select("id")
            .where("organization_id", "=", values.organizationId),
        )
        .execute();

      await db
        .insertInto("organization_person_roles")
        .values({
          organization_person_id: person.id,
          role: "LEGAL_REPRESENTATIVE",
          is_primary: 1,
          effective_from: now,
        })
        .onConflict((oc) =>
          oc
            .columns(["organization_person_id", "role", "effective_to"])
            .doNothing(),
        )
        .execute();
    },
    async findPrimaryLegalRepresentative(organizationId) {
      const row = await db
        .selectFrom("organization_person_roles as role")
        .innerJoin(
          "organization_people as person",
          "person.id",
          "role.organization_person_id",
        )
        .select([
          "person.organization_id",
          "person.nombres",
          "person.apellido_paterno",
          "person.apellido_materno",
          "person.dni",
          "person.telefono",
          "person.email",
        ])
        .where("person.organization_id", "=", organizationId)
        .where("role.role", "=", "LEGAL_REPRESENTATIVE")
        .where("role.is_primary", "=", 1)
        .where("role.effective_to", "is", null)
        .orderBy("role.effective_from", "desc")
        .executeTakeFirst();

      if (!row) return undefined;
      return {
        organizationId: row.organization_id,
        nombres: row.nombres,
        apellidoPaterno: row.apellido_paterno,
        apellidoMaterno: row.apellido_materno,
        dni: row.dni,
        telefono: row.telefono,
        email: row.email,
      };
    },
  };
}
