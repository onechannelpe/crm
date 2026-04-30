import type { Kysely } from "kysely";

import type { Database } from "../../types";

// Actor IDs from base seed
const SUP1 = 2; // diego.ramirez, supervisor, branch 1
const SUP2 = 8; // nicolas.torres, supervisor, branch 2
const BO1 = 4; // josefina.salazar, back_office, branch 1
const BO2 = 10; // lucia.cespedes, back_office, branch 2

// Executive IDs from base seed (one per lead)
const EXEC_CAMILA = 3; // camila.rojas, branch 1
const EXEC_PATRICIA = 5; // patricia.navarro, branch 1
const EXEC_ROBERTO = 6; // roberto.diaz, branch 1
const EXEC_ANDREA = 9; // andrea.quispe, branch 2
const EXEC_RENATO = 15; // renato.guzman, branch 1
const EXEC_DANIELA = 16; // daniela.mendoza, branch 1
const EXEC_GABRIEL = 17; // gabriel.rios, branch 2

export async function run(db: Kysely<Database>): Promise<void> {
  const existing = await db
    .selectFrom("workflow_leads")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();
  if (existing && Number(existing.count) > 0) return;

  const now = Date.now();
  const day = 86_400_000;
  const overlayTtl = 7 * day;

  // Lead IDs
  const idPending = crypto.randomUUID(); // PENDING_EXTERNAL_REVIEW
  const idNeeds = crypto.randomUUID(); // NEEDS_EXECUTIVE_INPUT
  const idReady = crypto.randomUUID(); // READY_FOR_QUOTATION
  const idQuoted = crypto.randomUUID(); // QUOTED
  const idForSale = crypto.randomUUID(); // READY_FOR_SALE
  const idConverted = crypto.randomUUID(); // CONVERTED
  const idRejected = crypto.randomUUID(); // REJECTED_BY_STATUS

  // Quotation and sale IDs
  const qidQuoted = crypto.randomUUID();
  const qidForSale = crypto.randomUUID();
  const qidConverted = crypto.randomUUID();
  const sidConverted = crypto.randomUUID();
  const vidConverted = crypto.randomUUID();

  await db
    .insertInto("workflow_leads")
    .values([
      {
        id: idPending,
        ruc: "20103615080",
        razon_social: "SERVICIOS GENERALES ANDINA SAC",
        address: "CAL. LOS NEGOCIOS NRO. 431 URB. RESIDENCIAL SAN ISIDRO",
        district: "SAN ISIDRO",
        department: "LIMA",
        executive_id: EXEC_CAMILA,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: SUP1,
        updated_by: null,
        created_at: now - day,
        updated_at: now - day,
      },
      {
        id: idNeeds,
        ruc: "20103176060",
        razon_social: "COMERCIAL ANDINA EIRL",
        address: "AV. INDUSTRIAL NRO. 620 URB. PERU",
        district: "LIMA",
        department: "LIMA",
        executive_id: EXEC_PATRICIA,
        stage: "NEEDS_EXECUTIVE_INPUT",
        status: "DISPONIBLE",
        prioridad: "SIN RESULTADO",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 4 * day,
        updated_at: now - 3 * day,
      },
      {
        id: idReady,
        ruc: "20538856674",
        razon_social: "DISTRIBUIDORA NORTE PERU SAC",
        address: "CAL. JOSE DE LA RIVA AGUERO NRO. 1023",
        district: "LOS OLIVOS",
        department: "LIMA",
        executive_id: EXEC_ROBERTO,
        stage: "READY_FOR_QUOTATION",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 7 * day,
        updated_at: now - 6 * day,
      },
      {
        id: idQuoted,
        ruc: "20542245671",
        razon_social: "INVERSIONES PACIFICO SRL",
        address: "AV. EL SOL NRO. 123 PISO 3",
        district: "CUSCO",
        department: "CUSCO",
        executive_id: EXEC_ANDREA,
        stage: "QUOTED",
        status: "DISPONIBLE",
        prioridad: "P2",
        created_by: SUP2,
        updated_by: BO2,
        created_at: now - 14 * day,
        updated_at: now - 10 * day,
      },
      {
        id: idForSale,
        ruc: "20394809218",
        razon_social: "LOGISTICA CENTRAL SA",
        address: "AV. NICOLAS ARRIOLA NRO. 2815",
        district: "LA VICTORIA",
        department: "LIMA",
        executive_id: EXEC_RENATO,
        stage: "READY_FOR_SALE",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 21 * day,
        updated_at: now - 15 * day,
      },
      {
        id: idConverted,
        ruc: "20219523468",
        razon_social: "CONSTRUCTORA ANDES SA",
        address: "AV. BENAVIDES NRO. 1855",
        district: "MIRAFLORES",
        department: "LIMA",
        executive_id: EXEC_DANIELA,
        stage: "CONVERTED",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: EXEC_DANIELA,
        created_at: now - 30 * day,
        updated_at: now - 20 * day,
      },
      {
        id: idRejected,
        ruc: "20353745400",
        razon_social: "TRANSPORTES LIMA NORTE EIRL",
        address: "AV. TUPAC AMARU KM. 14.5",
        district: "COMAS",
        department: "LIMA",
        executive_id: EXEC_GABRIEL,
        stage: "REJECTED_BY_STATUS",
        status: "CARTERIZADO",
        prioridad: "SIN RESULTADO",
        created_by: SUP2,
        updated_by: BO2,
        created_at: now - 3 * day,
        updated_at: now - 2 * day,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_lead_assignments")
    .values([
      {
        id: crypto.randomUUID(),
        lead_id: idPending,
        executive_id: EXEC_CAMILA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idNeeds,
        executive_id: EXEC_PATRICIA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 4 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idReady,
        executive_id: EXEC_ROBERTO,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 7 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        executive_id: EXEC_ANDREA,
        assigned_by: SUP2,
        is_active: 1,
        assigned_at: now - 14 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        executive_id: EXEC_RENATO,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 21 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        executive_id: EXEC_DANIELA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 30 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idRejected,
        executive_id: EXEC_GABRIEL,
        assigned_by: SUP2,
        is_active: 1,
        assigned_at: now - 3 * day,
      },
    ])
    .execute();

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

  await db
    .insertInto("workflow_quotations")
    .values([
      {
        id: qidQuoted,
        lead_id: idQuoted,
        payback_pricing: 1.2,
        tarifa_debito: 0.9,
        tarifa_credito: 2.3,
        tarifa_foraneo: 1.7,
        fee: 18.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 10 * day,
        created_by: BO2,
      },
      {
        id: qidForSale,
        lead_id: idForSale,
        payback_pricing: 1.15,
        tarifa_debito: 0.85,
        tarifa_credito: 2.2,
        tarifa_foraneo: 1.6,
        fee: 20.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 18 * day,
        created_by: BO1,
      },
      {
        id: qidConverted,
        lead_id: idConverted,
        payback_pricing: 1.25,
        tarifa_debito: 0.95,
        tarifa_credito: 2.5,
        tarifa_foraneo: 1.8,
        fee: 15.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 27 * day,
        created_by: BO1,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sales")
    .values([
      {
        id: sidConverted,
        lead_id: idConverted,
        executive_id: EXEC_DANIELA,
        created_at: now - 20 * day,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sale_venues")
    .values([
      {
        id: vidConverted,
        sale_id: sidConverted,
        lead_id: idConverted,
        nombre_comercial: "Andes Miraflores",
        cantidad_pos: 3,
        direccion: "AV. BENAVIDES NRO. 1855",
        referencia: "Frente al parque central",
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        created_at: now - 20 * day,
        created_by: EXEC_DANIELA,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sale_venue_accounts")
    .values([
      {
        id: crypto.randomUUID(),
        venue_id: vidConverted,
        currency: "PEN",
        bank: "BCP",
        account_type: "CORRIENTE",
        account_number: "194-12345678-0-21",
        cci: null,
        is_settlement: 1,
      },
      {
        id: crypto.randomUUID(),
        venue_id: vidConverted,
        currency: "USD",
        bank: "BBVA",
        account_type: "AHORROS",
        account_number: "0011-0245-9988776655",
        cci: "01124500998877665522",
        is_settlement: 0,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_lead_commercial_inputs")
    .values([
      {
        lead_id: idConverted,
        proveedor_actual: "BBVA",
        tasa_actual: 2.8,
        gpv: 85_000.0,
        ticket: 245.5,
        giro_negocio: "Construccion de edificios residenciales",
        tipo_producto: "CULQI_FULL",
        url_cliente: null,
        modalidad_cobro: "CARGO_UNICO",
        rep_legal_nombres: "Daniel",
        rep_legal_apellido_paterno: "Gutierrez",
        rep_legal_apellido_materno: "Paredes",
        rep_legal_dni: "42715983",
        rep_legal_telefono: "987654321",
        rep_legal_email: "daniel.gutierrez@andes.pe",
        updated_at: now - 29 * day,
        updated_by: BO1,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_history_events")
    .values([
      // Lead: PENDING_EXTERNAL_REVIEW
      {
        id: crypto.randomUUID(),
        lead_id: idPending,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20103615080",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idPending,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_CAMILA,
        payload_json: JSON.stringify({ executiveId: EXEC_CAMILA }),
        occurred_at: now - day + 1_000,
      },

      // Lead: NEEDS_EXECUTIVE_INPUT
      {
        id: crypto.randomUUID(),
        lead_id: idNeeds,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20103176060",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 4 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idNeeds,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_PATRICIA,
        payload_json: JSON.stringify({ executiveId: EXEC_PATRICIA }),
        occurred_at: now - 4 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idNeeds,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "SIN RESULTADO",
          reason:
            "Cliente sin resultado en primera llamada, requiere seguimiento del ejecutivo",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "NEEDS_EXECUTIVE_INPUT",
        }),
        occurred_at: now - 3 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idNeeds,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "NEEDS_EXECUTIVE_INPUT",
        }),
        occurred_at: now - 3 * day + 100,
      },

      // Lead: READY_FOR_QUOTATION
      {
        id: crypto.randomUUID(),
        lead_id: idReady,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20538856674",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 7 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idReady,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_ROBERTO,
        payload_json: JSON.stringify({ executiveId: EXEC_ROBERTO }),
        occurred_at: now - 7 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idReady,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Cliente activo con alto volumen de operaciones, excelente candidato",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 6 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idReady,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 6 * day + 100,
      },

      // Lead: QUOTED
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "lead_registered",
        actor_user_id: SUP2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20542245671",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 14 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "lead_assigned",
        actor_user_id: SUP2,
        subject_user_id: EXEC_ANDREA,
        payload_json: JSON.stringify({ executiveId: EXEC_ANDREA }),
        occurred_at: now - 14 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "lead_reviewed",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P2",
          reason:
            "Cliente interesado, solicito cotizacion competitiva frente a proveedor actual",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 13 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 13 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "quotation_created",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidQuoted,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 10 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idQuoted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 10 * day + 100,
      },

      // Lead: READY_FOR_SALE
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20394809218",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 21 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_RENATO,
        payload_json: JSON.stringify({ executiveId: EXEC_RENATO }),
        occurred_at: now - 21 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Empresa con alta facturacion mensual, perfil ideal para conversion",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 20 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 20 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "quotation_created",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidForSale,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 18 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 18 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "sale_approved",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: null,
        occurred_at: now - 15 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "QUOTED",
          to: "READY_FOR_SALE",
        }),
        occurred_at: now - 15 * day + 100,
      },

      // Lead: CONVERTED
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20219523468",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 30 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_DANIELA,
        payload_json: JSON.stringify({ executiveId: EXEC_DANIELA }),
        occurred_at: now - 30 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Empresa constructora consolidada con gran volumen potencial y apertura al cambio",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 29 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 29 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "quotation_created",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidConverted,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 27 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 27 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "sale_approved",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: null,
        occurred_at: now - 25 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "QUOTED",
          to: "READY_FOR_SALE",
        }),
        occurred_at: now - 25 * day + 100,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "venue_added",
        actor_user_id: EXEC_DANIELA,
        subject_user_id: null,
        payload_json: JSON.stringify({
          venueId: vidConverted,
          saleId: sidConverted,
          nombreComercial: "Andes Miraflores",
          isFirstVenue: true,
        }),
        occurred_at: now - 20 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_SALE",
          to: "CONVERTED",
        }),
        occurred_at: now - 20 * day + 100,
      },

      // Lead: REJECTED_BY_STATUS
      {
        id: crypto.randomUUID(),
        lead_id: idRejected,
        event_type: "lead_registered",
        actor_user_id: SUP2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20353745400",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 3 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idRejected,
        event_type: "lead_assigned",
        actor_user_id: SUP2,
        subject_user_id: EXEC_GABRIEL,
        payload_json: JSON.stringify({ executiveId: EXEC_GABRIEL }),
        occurred_at: now - 3 * day + 1_000,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idRejected,
        event_type: "lead_reviewed",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "CARTERIZADO",
          prioridad: "SIN RESULTADO",
          reason:
            "Empresa ya tiene contrato activo con otro proveedor sin apertura a negociar",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "REJECTED_BY_STATUS",
        }),
        occurred_at: now - 2 * day,
      },
      {
        id: crypto.randomUUID(),
        lead_id: idRejected,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "REJECTED_BY_STATUS",
        }),
        occurred_at: now - 2 * day + 100,
      },
    ])
    .execute();
}
