import { personDisplayName } from "~/domain/identity/display-name";
import type {
  OrganizationId,
  OrganizationPersonId,
  PersonId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

export const LEGAL_REPRESENTATIVE_ROLE = "LEGAL_REPRESENTATIVE";

export type OrganizationProfile = {
  id: OrganizationId;
  ruc: string;
  legalName: string | null;
  lineOfBusiness: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
};

// Surnames are nullable: a prospected person may be known only by a single
// unstructured `names` string.
export type PersonIdentity = {
  dni: string;
  names: string;
  firstSurname: string | null;
  secondSurname: string | null;
  email: string | null;
};

export type PersonView = PersonIdentity & {
  id: PersonId;
  displayName: string;
};

// Membership stores the organization-specific contact channel.
export type Membership = {
  id: OrganizationPersonId;
  organizationId: OrganizationId;
  person: PersonView;
  phone: string | null;
  email: string | null;
};

export type OrganizationRepository = {
  findOrganizationByRuc(ruc: string): Promise<OrganizationProfile | null>;
  findOrganizationById(id: OrganizationId): Promise<OrganizationProfile | null>;
  upsertOrganization(input: {
    ruc: string;
    legalName?: string | null;
    lineOfBusiness?: string | null;
    address?: string | null;
    district?: string | null;
    department?: string | null;
    /** Operation instant that stamps the row. */
    at: Date;
  }): Promise<OrganizationProfile>;
  updateCommercialProfile(input: {
    organizationId: OrganizationId;
    lineOfBusiness: string | null;
  }): Promise<void>;
  applyEnrichment(input: {
    ruc: string;
    legalName?: string;
    address?: string;
    district?: string;
    department?: string;
  }): Promise<void>;
  upsertMembership(input: {
    organizationId: OrganizationId;
    person: PersonIdentity;
    phone: string | null;
    email: string | null;
    /** Operation instant that stamps the row. */
    at: Date;
  }): Promise<Membership>;
  findMembership(input: {
    organizationId: OrganizationId;
    dni: string;
  }): Promise<Membership | null>;
  findMembershipById(id: OrganizationPersonId): Promise<Membership | null>;
  setPrimaryRole(input: {
    organizationId: OrganizationId;
    organizationPersonId: OrganizationPersonId;
    role: string;
    /** Operation instant that stamps the row. */
    at: Date;
  }): Promise<void>;
  findPrimaryRepresentative(
    organizationId: OrganizationId,
  ): Promise<Membership | null>;
};

type OrganizationRow = {
  id: OrganizationId;
  ruc: string;
  legal_name: string | null;
  line_of_business: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
};

function toOrganizationProfile(row: OrganizationRow): OrganizationProfile {
  return {
    id: row.id,
    ruc: row.ruc,
    legalName: row.legal_name,
    lineOfBusiness: row.line_of_business,
    address: row.address,
    district: row.district,
    province: row.province,
    department: row.department,
    phone: row.phone,
    email: row.email,
  };
}

type MembershipRow = {
  id: OrganizationPersonId;
  organization_id: OrganizationId;
  phone: string | null;
  email: string | null;
  person_id: PersonId;
  dni: string;
  names: string;
  first_surname: string | null;
  second_surname: string | null;
  person_email: string | null;
};

function toMembership(row: MembershipRow): Membership {
  const person: PersonView = {
    id: row.person_id,
    dni: row.dni,
    names: row.names,
    firstSurname: row.first_surname,
    secondSurname: row.second_surname,
    email: row.person_email,
    displayName: personDisplayName({
      names: row.names,
      first_surname: row.first_surname,
      second_surname: row.second_surname,
    }),
  };
  return {
    id: row.id,
    organizationId: row.organization_id,
    person,
    phone: row.phone,
    email: row.email,
  };
}

export function createOrganizationRepo(
  db: DatabaseExecutor,
): OrganizationRepository {
  const membershipQuery = () =>
    db
      .selectFrom("organization_people")
      .innerJoin("people", "people.id", "organization_people.person_id")
      .select([
        "organization_people.id as id",
        "organization_people.organization_id as organization_id",
        "organization_people.phone as phone",
        "organization_people.email as email",
        "organization_people.person_id as person_id",
        "people.dni as dni",
        "people.names as names",
        "people.first_surname as first_surname",
        "people.second_surname as second_surname",
        "people.email as person_email",
      ]);

  async function upsertPerson(
    person: PersonIdentity,
    now: Date,
  ): Promise<PersonId> {
    await db
      .insertInto("people")
      .values({
        dni: person.dni,
        names: person.names,
        first_surname: person.firstSurname,
        second_surname: person.secondSurname,
        email: person.email,
        created_at: now,
        updated_at: now,
      })
      // Preserve existing details when an incoming record only supplies a display name.
      .onConflict((oc) =>
        oc.column("dni").doUpdateSet((eb) => ({
          names: eb.ref("excluded.names"),
          first_surname: eb.fn.coalesce(
            eb.ref("excluded.first_surname"),
            eb.ref("people.first_surname"),
          ),
          second_surname: eb.fn.coalesce(
            eb.ref("excluded.second_surname"),
            eb.ref("people.second_surname"),
          ),
          email: eb.fn.coalesce(
            eb.ref("excluded.email"),
            eb.ref("people.email"),
          ),
          updated_at: now,
        })),
      )
      .execute();

    const row = await db
      .selectFrom("people")
      .select("id")
      .where("dni", "=", person.dni)
      .executeTakeFirstOrThrow();
    return row.id;
  }

  return {
    async findOrganizationByRuc(ruc) {
      const row = await db
        .selectFrom("organizations")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
      return row ? toOrganizationProfile(row) : null;
    },

    async findOrganizationById(id) {
      const row = await db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? toOrganizationProfile(row) : null;
    },

    async upsertOrganization(input) {
      await db
        .insertInto("organizations")
        .values({
          ruc: input.ruc,
          legal_name: input.legalName ?? null,
          line_of_business: input.lineOfBusiness ?? null,
          address: input.address ?? null,
          district: input.district ?? null,
          department: input.department ?? null,
          created_at: input.at,
        })
        .onConflict((oc) => oc.column("ruc").doNothing())
        .execute();

      const row = await db
        .selectFrom("organizations")
        .selectAll()
        .where("ruc", "=", input.ruc)
        .executeTakeFirstOrThrow();
      return toOrganizationProfile(row);
    },

    async updateCommercialProfile(input) {
      await db
        .updateTable("organizations")
        .set({ line_of_business: input.lineOfBusiness })
        .where("id", "=", input.organizationId)
        .execute();
    },

    async applyEnrichment(input) {
      const patch: {
        legal_name?: string;
        address?: string;
        district?: string;
        department?: string;
      } = {};
      if (input.legalName !== undefined) patch.legal_name = input.legalName;
      if (input.address !== undefined) patch.address = input.address;
      if (input.district !== undefined) patch.district = input.district;
      if (input.department !== undefined) patch.department = input.department;
      if (Object.keys(patch).length === 0) return;

      await db
        .updateTable("organizations")
        .set(patch)
        .where("ruc", "=", input.ruc)
        .execute();
    },

    async upsertMembership(input) {
      const now = input.at;
      const personId = await upsertPerson(input.person, now);

      await db
        .insertInto("organization_people")
        .values({
          person_id: personId,
          organization_id: input.organizationId,
          phone: input.phone,
          email: input.email,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.columns(["organization_id", "person_id"]).doUpdateSet((eb) => ({
            phone: eb.fn.coalesce(
              eb.ref("excluded.phone"),
              eb.ref("organization_people.phone"),
            ),
            email: eb.fn.coalesce(
              eb.ref("excluded.email"),
              eb.ref("organization_people.email"),
            ),
            updated_at: now,
          })),
        )
        .execute();

      const row = await membershipQuery()
        .where("organization_people.organization_id", "=", input.organizationId)
        .where("organization_people.person_id", "=", personId)
        .executeTakeFirstOrThrow();
      return toMembership(row);
    },

    async findMembership(input) {
      const row = await membershipQuery()
        .where("organization_people.organization_id", "=", input.organizationId)
        .where("people.dni", "=", input.dni)
        .executeTakeFirst();
      return row ? toMembership(row) : null;
    },

    async findMembershipById(id) {
      const row = await membershipQuery()
        .where("organization_people.id", "=", id)
        .executeTakeFirst();
      return row ? toMembership(row) : null;
    },

    async setPrimaryRole(input) {
      const now = input.at;
      const memberIds = (
        await db
          .selectFrom("organization_people")
          .select("id")
          .where("organization_id", "=", input.organizationId)
          .execute()
      ).map((row) => row.id);

      // Close the current primary before opening the new interval: one primary
      // holder per (organization, role).
      if (memberIds.length > 0) {
        await db
          .updateTable("organization_person_roles")
          .set({ effective_to: now, is_primary: false })
          .where("role", "=", input.role)
          .where("is_primary", "=", true)
          .where("organization_person_id", "in", memberIds)
          .execute();
      }

      await db
        .insertInto("organization_person_roles")
        .values({
          organization_person_id: input.organizationPersonId,
          role: input.role,
          is_primary: true,
          effective_from: now,
        })
        .onConflict((oc) =>
          oc
            .columns(["organization_person_id", "role", "effective_to"])
            .doNothing(),
        )
        .execute();
    },

    async findPrimaryRepresentative(organizationId) {
      const row = await membershipQuery()
        .innerJoin(
          "organization_person_roles as role",
          "role.organization_person_id",
          "organization_people.id",
        )
        .where("organization_people.organization_id", "=", organizationId)
        .where("role.role", "=", LEGAL_REPRESENTATIVE_ROLE)
        .where("role.is_primary", "=", true)
        .where("role.effective_to", "is", null)
        .orderBy("role.effective_from", "desc")
        .executeTakeFirst();
      return row ? toMembership(row) : null;
    },
  };
}
