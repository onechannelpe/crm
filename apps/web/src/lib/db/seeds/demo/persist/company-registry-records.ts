import type { Kysely } from "kysely";

import type { Database } from "../../../types";

type SeedRecord = {
  ruc: string;
  legalName: string;
  address: string;
  district: string;
  department: string;
  activity: { code: string; label: string };
  ageDays: number;
};

const RECORDS: SeedRecord[] = [
  {
    ruc: "20103615080",
    legalName: "SERVICIOS GENERALES ANDINA SAC",
    address: "CAL. LOS NEGOCIOS NRO. 431 URB. RESIDENCIAL SAN ISIDRO",
    district: "SAN ISIDRO",
    department: "LIMA",
    activity: {
      code: "7490",
      label: "OTRAS ACTIVIDADES PROFESIONALES CIENTIFICAS Y TECNICAS",
    },
    ageDays: 1,
  },
  {
    ruc: "20103176060",
    legalName: "COMERCIAL ANDINA EIRL",
    address: "AV. INDUSTRIAL NRO. 620 URB. PERU",
    district: "LIMA",
    department: "LIMA",
    activity: { code: "4612", label: "AGENTES MAYORISTAS DE COMBUSTIBLES MINERALES" },
    ageDays: 4,
  },
  {
    ruc: "20538856674",
    legalName: "DISTRIBUIDORA NORTE PERU SAC",
    address: "CAL. JOSE DE LA RIVA AGUERO NRO. 1023",
    district: "LOS OLIVOS",
    department: "LIMA",
    activity: { code: "4690", label: "VENTA AL POR MAYOR NO ESPECIALIZADA" },
    ageDays: 7,
  },
  {
    ruc: "20542245671",
    legalName: "INVERSIONES PACIFICO SRL",
    address: "AV. EL SOL NRO. 123 PISO 3",
    district: "CUSCO",
    department: "CUSCO",
    activity: { code: "4641", label: "VENTA AL POR MAYOR DE PRODUCTOS TEXTILES" },
    ageDays: 14,
  },
  {
    ruc: "20394809218",
    legalName: "LOGISTICA CENTRAL SA",
    address: "AV. NICOLAS ARRIOLA NRO. 2815",
    district: "LA VICTORIA",
    department: "LIMA",
    activity: { code: "5210", label: "ALMACENAMIENTO Y DEPOSITO" },
    ageDays: 21,
  },
  {
    ruc: "20219523468",
    legalName: "CONSTRUCTORA ANDES SA",
    address: "AV. BENAVIDES NRO. 1855",
    district: "MIRAFLORES",
    department: "LIMA",
    activity: { code: "4100", label: "CONSTRUCCION DE EDIFICIOS" },
    ageDays: 30,
  },
  {
    ruc: "20353745400",
    legalName: "TRANSPORTES LIMA NORTE EIRL",
    address: "AV. TUPAC AMARU KM. 14.5",
    district: "COMAS",
    department: "LIMA",
    activity: { code: "4923", label: "TRANSPORTE DE CARGA POR CARRETERA" },
    ageDays: 3,
  },
];

export async function persistCompanyRegistryRecords(
  db: Kysely<Database>,
  now: number,
  day: number,
  overlayTtl: number,
): Promise<void> {
  await db
    .insertInto("company_registry_record")
    .values(
      RECORDS.map((record) => {
        const fetchedAt = new Date(now - record.ageDays * day);
        return {
          document_type: "ruc" as const,
          document_value: record.ruc,
          full_name: null,
          legal_name: record.legalName,
          address: record.address,
          district: record.district,
          department: record.department,
          contributor_status: "ACTIVO",
          contributor_condition: "HABIDO",
          economic_activities_json: JSON.stringify([record.activity]),
          payload_json: JSON.stringify({
            ruc: record.ruc,
            legalName: record.legalName,
            estado: "ACTIVO",
            condicion: "HABIDO",
          }),
          source: "sunat" as const,
          fetched_at: fetchedAt,
          expires_at: new Date(now - record.ageDays * day + overlayTtl),
          queue_state: "done" as const,
          available_at: fetchedAt,
          last_error: null,
          requested_by_user_id: null,
          requested_at: fetchedAt,
        };
      }),
    )
    .onConflict((oc) =>
      oc.columns(["document_type", "document_value"]).doUpdateSet((eb) => ({
        full_name: eb.ref("excluded.full_name"),
        legal_name: eb.ref("excluded.legal_name"),
        address: eb.ref("excluded.address"),
        district: eb.ref("excluded.district"),
        department: eb.ref("excluded.department"),
        contributor_status: eb.ref("excluded.contributor_status"),
        contributor_condition: eb.ref("excluded.contributor_condition"),
        economic_activities_json: eb.ref("excluded.economic_activities_json"),
        source: eb.ref("excluded.source"),
        fetched_at: eb.ref("excluded.fetched_at"),
        expires_at: eb.ref("excluded.expires_at"),
        payload_json: eb.ref("excluded.payload_json"),
      })),
    )
    .execute();
}
