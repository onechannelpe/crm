import type { Kysely } from "kysely";

import type { Database } from "../../../types";

export async function persistSearchOverlays(
  db: Kysely<Database>,
  now: number,
  day: number,
  overlayTtl: number,
): Promise<void> {
  await db
    .insertInto("search_enrichment_overlays")
    .values([
      {
        document_type: "ruc",
        document_value: "20103615080",
        full_name: null,
        legal_name: "SERVICIOS GENERALES ANDINA SAC",
        address: "CAL. LOS NEGOCIOS NRO. 431 URB. RESIDENCIAL SAN ISIDRO",
        district: "SAN ISIDRO",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          {
            code: "7490",
            label: "OTRAS ACTIVIDADES PROFESIONALES CIENTIFICAS Y TECNICAS",
          },
        ]),
        source: "sunat",
        fetched_at: now - day,
        expires_at: now - day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20103615080",
          razonSocial: "SERVICIOS GENERALES ANDINA SAC",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20103176060",
        full_name: null,
        legal_name: "COMERCIAL ANDINA EIRL",
        address: "AV. INDUSTRIAL NRO. 620 URB. PERU",
        district: "LIMA",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          {
            code: "4612",
            label: "AGENTES MAYORISTAS DE COMBUSTIBLES MINERALES",
          },
        ]),
        source: "sunat",
        fetched_at: now - 4 * day,
        expires_at: now - 4 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20103176060",
          razonSocial: "COMERCIAL ANDINA EIRL",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20538856674",
        full_name: null,
        legal_name: "DISTRIBUIDORA NORTE PERU SAC",
        address: "CAL. JOSE DE LA RIVA AGUERO NRO. 1023",
        district: "LOS OLIVOS",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          { code: "4690", label: "VENTA AL POR MAYOR NO ESPECIALIZADA" },
        ]),
        source: "sunat",
        fetched_at: now - 7 * day,
        expires_at: now - 7 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20538856674",
          razonSocial: "DISTRIBUIDORA NORTE PERU SAC",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20542245671",
        full_name: null,
        legal_name: "INVERSIONES PACIFICO SRL",
        address: "AV. EL SOL NRO. 123 PISO 3",
        district: "CUSCO",
        department: "CUSCO",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          { code: "4641", label: "VENTA AL POR MAYOR DE PRODUCTOS TEXTILES" },
        ]),
        source: "sunat",
        fetched_at: now - 14 * day,
        expires_at: now - 14 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20542245671",
          razonSocial: "INVERSIONES PACIFICO SRL",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20394809218",
        full_name: null,
        legal_name: "LOGISTICA CENTRAL SA",
        address: "AV. NICOLAS ARRIOLA NRO. 2815",
        district: "LA VICTORIA",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          { code: "5210", label: "ALMACENAMIENTO Y DEPOSITO" },
        ]),
        source: "sunat",
        fetched_at: now - 21 * day,
        expires_at: now - 21 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20394809218",
          razonSocial: "LOGISTICA CENTRAL SA",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20219523468",
        full_name: null,
        legal_name: "CONSTRUCTORA ANDES SA",
        address: "AV. BENAVIDES NRO. 1855",
        district: "MIRAFLORES",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          { code: "4100", label: "CONSTRUCCION DE EDIFICIOS" },
        ]),
        source: "sunat",
        fetched_at: now - 30 * day,
        expires_at: now - 30 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20219523468",
          razonSocial: "CONSTRUCTORA ANDES SA",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
      {
        document_type: "ruc",
        document_value: "20353745400",
        full_name: null,
        legal_name: "TRANSPORTES LIMA NORTE EIRL",
        address: "AV. TUPAC AMARU KM. 14.5",
        district: "COMAS",
        department: "LIMA",
        contributor_status: "ACTIVO",
        contributor_condition: "HABIDO",
        economic_activities_json: JSON.stringify([
          { code: "4923", label: "TRANSPORTE DE CARGA POR CARRETERA" },
        ]),
        source: "sunat",
        fetched_at: now - 3 * day,
        expires_at: now - 3 * day + overlayTtl,
        payload_json: JSON.stringify({
          ruc: "20353745400",
          razonSocial: "TRANSPORTES LIMA NORTE EIRL",
          estado: "ACTIVO",
          condicion: "HABIDO",
        }),
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}
