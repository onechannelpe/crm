import type {
  CloseReason,
  CollectionMode,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ProductScope,
  SettlementBank,
} from "~/contracts/workflow/vocabulary";
import type { UserId } from "~/server/shared/ids";

import {
  CAMILA,
  CLAUDIA,
  DIEGO,
  ELENA,
  FERNANDA,
  GABRIEL,
  ISABELLA,
  JOSE,
  JOSEFINA,
  LUCIA,
  MANUEL,
  MARIANA,
  MARINA,
  MATIAS,
  NICOLAS,
  PABLO,
  SOFIA,
} from "./demo-ids";

export const SUPERVISORS = { DIEGO, NICOLAS, MARIANA } as const;
export const BACK_OFFICE = { JOSEFINA, GABRIEL } as const;
export const EXECUTIVES = {
  CAMILA,
  MATIAS,
  LUCIA,
  SOFIA,
  FERNANDA,
  CLAUDIA,
  PABLO,
  ELENA,
  ISABELLA,
  MANUEL,
  MARINA,
  JOSE,
} as const;

// Company registry / organization identity for a lead. Fully synthetic; the
// same record feeds the organizations row, the SUNAT overlay, and any venue.
export interface OrgSpec {
  ruc: string;
  legalName: string;
  address: string;
  district: string;
  province: string;
  department: string;
  activity: { code: string; label: string };
  lineOfBusiness: string;
  registryAgeDays: number;
}

// A back-office availability call that moves a lead out of QUALIFYING. toStage
// is PRICING for a normal review, DISQUALIFIED when the lead is rejected.
export interface ReviewSpec {
  by: UserId;
  reason: string;
  status: LeadStatus;
  priority: LeadPriority;
  toStage: Extract<LeadStage, "PRICING" | "DISQUALIFIED">;
  offsetDays: number;
}

export interface RateProposalSpec {
  round: number;
  paybackPricing: number;
  debitRate: number;
  creditRate: number;
  foreignRate: number;
  fee: number;
  currency: "PEN" | "USD";
  proposedBy: UserId;
  proposedOffsetDays: number;
  outcome: "pending" | "accepted" | "revision_requested";
  decidedOffsetDays?: number;
  acceptedBy?: UserId;
}

export interface VenueAccountSpec {
  currency: "PEN" | "USD";
  bank: SettlementBank;
  accountType: "AHORROS" | "CORRIENTE";
  accountNumber: string;
  cci: string | null;
  isSettlement: boolean;
}

export interface VenueSpec {
  tradeName: string;
  posQuantity: number;
  address: string;
  addressReference: string;
  createdOffsetDays: number;
  createdBy: UserId;
  accounts: VenueAccountSpec[];
}

export interface DigitalPolicySpec {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
  updatedOffsetDays: number;
  updatedBy: UserId;
}

export interface LegalRepSpec {
  dni: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  phone: string;
  offsetDays: number;
}

export interface LeadCurrent {
  provider: string;
  debitRate: number;
  creditRate: number;
  gpv: number;
  ticket: number;
  settlementBank: SettlementBank;
  posCount: number;
}

// A stage_changed step past PRICING. `from` is the previous stage in the list.
export interface AdvanceSpec {
  to: Extract<LeadStage, "SETUP" | "FULFILLMENT" | "LIVE">;
  offsetDays: number;
}

export interface LeadSpec {
  key: string;
  org: OrgSpec;
  executiveId: UserId;
  createdBy: UserId;
  updatedBy: UserId | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdOffsetDays: number;
  reservationOffsetDays?: number;
  current: LeadCurrent;
  review?: ReviewSpec;
  proposals?: RateProposalSpec[];
  advances?: AdvanceSpec[];
  venue?: VenueSpec;
  digitalPolicy?: DigitalPolicySpec;
  legalRep?: LegalRepSpec;
  close?: {
    reason: CloseReason;
    note: string | null;
    by: UserId;
    offsetDays: number;
  };
  expiredOffsetDays?: number;
}

const ACTIVITY = {
  wholesale: { code: "4690", label: "VENTA AL POR MAYOR NO ESPECIALIZADA" },
  retail: {
    code: "4711",
    label: "VENTA AL POR MENOR EN COMERCIOS NO ESPECIALIZADOS",
  },
  restaurant: {
    code: "5610",
    label: "ACTIVIDADES DE RESTAURANTES Y DE SERVICIO DE COMIDAS",
  },
  construction: { code: "4100", label: "CONSTRUCCION DE EDIFICIOS" },
  transport: { code: "4923", label: "TRANSPORTE DE CARGA POR CARRETERA" },
  textiles: { code: "4641", label: "VENTA AL POR MAYOR DE PRODUCTOS TEXTILES" },
  pharmacy: {
    code: "4772",
    label: "VENTA AL POR MENOR DE PRODUCTOS FARMACEUTICOS",
  },
  storage: { code: "5210", label: "ALMACENAMIENTO Y DEPOSITO" },
} as const;

// One lead per (stage, status, priority) coverage point, several leads per
// stage, so a fresh seed populates the whole pipeline board and every record
// state a dev would otherwise walk a RUC through by hand. Commercial and venue
// detail is attached to representative leads; the rest carry a valid but light
// footprint (lead + assignment + registration/review events).
export const LEAD_SPECS: LeadSpec[] = [
  // ── QUALIFYING (pre-review; status/priority null) ──────────────────────────
  {
    key: "qualifying-andina",
    org: {
      ruc: "20103615080",
      legalName: "SERVICIOS GENERALES ANDINA SAC",
      address: "CAL. LOS NEGOCIOS NRO. 431 URB. RESIDENCIAL SAN ISIDRO",
      district: "SAN ISIDRO",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Distribucion de suministros de oficina",
      registryAgeDays: 1,
    },
    executiveId: EXECUTIVES.CAMILA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdOffsetDays: 1,
    current: current("BCP", 2.5, 2.9, 45_000, 120, "BCP", 2),
  },
  {
    key: "qualifying-vista",
    org: {
      ruc: "20512345678",
      legalName: "COMERCIAL VISTA ALEGRE EIRL",
      address: "AV. LOS FRUTALES NRO. 210",
      district: "ATE",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.retail,
      lineOfBusiness: "Minimarket de abarrotes",
      registryAgeDays: 2,
    },
    executiveId: EXECUTIVES.MANUEL,
    createdBy: SUPERVISORS.MARIANA,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdOffsetDays: 2,
    current: current("INTERBANK", 2.6, 2.95, 22_000, 60, "INTERBANK", 1),
  },
  {
    key: "qualifying-costanera",
    org: {
      ruc: "20487654321",
      legalName: "INVERSIONES COSTANERA SRL",
      address: "MZA. F LOTE 12 URB. LA CAMPIÑA",
      district: "CHORRILLOS",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.restaurant,
      lineOfBusiness: "Restaurante marino",
      registryAgeDays: 3,
    },
    executiveId: EXECUTIVES.SOFIA,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdOffsetDays: 3,
    current: current("BBVA", 2.7, 3.0, 38_000, 95, "BBVA", 2),
  },

  // ── DISQUALIFIED (back office rejected at review) ───────────────────────────
  {
    key: "disqualified-carterizado",
    org: {
      ruc: "20353745400",
      legalName: "TRANSPORTES LIMA NORTE EIRL",
      address: "AV. TUPAC AMARU KM. 14.5",
      district: "COMAS",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.transport,
      lineOfBusiness: "Transporte de carga por carretera",
      registryAgeDays: 3,
    },
    executiveId: EXECUTIVES.PABLO,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: BACK_OFFICE.GABRIEL,
    stage: "DISQUALIFIED",
    status: "CARTERIZADO",
    priority: "SIN RESULTADO",
    createdOffsetDays: 6,
    current: current("NACION", 2.4, 2.85, 30_000, 90, "NACION", 1),
    review: {
      by: BACK_OFFICE.GABRIEL,
      reason: "RUC ya carterizado por otro dealer en la consulta de Culqi",
      status: "CARTERIZADO",
      priority: "SIN RESULTADO",
      toStage: "DISQUALIFIED",
      offsetDays: 5,
    },
  },
  {
    key: "disqualified-sinresultado",
    org: {
      ruc: "20477889900",
      legalName: "SERVICIOS INTEGRALES DEL SUR SAC",
      address: "AV. DANIEL A. CARRION NRO. 850",
      district: "AREQUIPA",
      province: "AREQUIPA",
      department: "AREQUIPA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Distribucion de bebidas",
      registryAgeDays: 4,
    },
    executiveId: EXECUTIVES.MANUEL,
    createdBy: SUPERVISORS.MARIANA,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "DISQUALIFIED",
    status: "SIN RESULTADO",
    priority: "SIN RESULTADO",
    createdOffsetDays: 8,
    current: current("SCOTIABANK", 2.55, 2.9, 18_000, 70, "SCOTIABANK", 1),
    review: {
      by: BACK_OFFICE.JOSEFINA,
      reason: "Sin resultado: el comercio no califica para el producto",
      status: "SIN RESULTADO",
      priority: "SIN RESULTADO",
      toStage: "DISQUALIFIED",
      offsetDays: 6,
    },
  },

  // ── PRICING (available, being quoted) ───────────────────────────────────────
  {
    key: "pricing-p1-norte",
    org: {
      ruc: "20538856674",
      legalName: "DISTRIBUIDORA NORTE PERU SAC",
      address: "CAL. JOSE DE LA RIVA AGUERO NRO. 1023",
      district: "LOS OLIVOS",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Venta al por mayor no especializada",
      registryAgeDays: 7,
    },
    executiveId: EXECUTIVES.LUCIA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 7,
    current: current("SCOTIABANK", 2.7, 3.05, 95_000, 210, "INTERBANK", 5),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P1",
      "DISPONIBLE",
      "Alto volumen, excelente candidato",
      6,
    ),
    proposals: [
      proposal(1, 0.9, 2.3, "pending", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 4,
      }),
    ],
  },
  {
    key: "pricing-p2-pacifico",
    org: {
      ruc: "20542245671",
      legalName: "INVERSIONES PACIFICO SRL",
      address: "AV. EL SOL NRO. 123 PISO 3",
      district: "CUSCO",
      province: "CUSCO",
      department: "CUSCO",
      activity: ACTIVITY.textiles,
      lineOfBusiness: "Venta al por mayor de productos textiles",
      registryAgeDays: 14,
    },
    executiveId: EXECUTIVES.MATIAS,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 12,
    current: current("BBVA", 2.6, 3.0, 60_000, 150, "BBVA", 3),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P2",
      "DISPONIBLE",
      "Disponible según la consulta de cartera de Culqi",
      9,
    ),
    proposals: [
      proposal(1, 0.95, 2.4, "pending", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 6,
      }),
    ],
  },
  {
    key: "pricing-stock-mercado",
    org: {
      ruc: "20601234567",
      legalName: "MERCADO CENTRAL EXPRESS SAC",
      address: "JR. AYACUCHO NRO. 456",
      district: "HUANCAYO",
      province: "HUANCAYO",
      department: "JUNIN",
      activity: ACTIVITY.retail,
      lineOfBusiness: "Comercio minorista de abarrotes",
      registryAgeDays: 10,
    },
    executiveId: EXECUTIVES.SOFIA,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: BACK_OFFICE.GABRIEL,
    stage: "PRICING",
    status: "STOCK",
    priority: "P2",
    createdOffsetDays: 11,
    current: current("INTERBANK", 2.65, 2.95, 52_000, 130, "BCP", 2),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P2",
      "STOCK",
      "Cliente con POS en stock, listo para reactivar",
      8,
    ),
    proposals: [
      proposal(1, 0.92, 2.35, "pending", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 5,
      }),
    ],
  },
  {
    key: "pricing-reserved-altura",
    org: {
      ruc: "20609876543",
      legalName: "COMERCIALIZADORA ALTURA SRL",
      address: "AV. LOS INCAS NRO. 1200",
      district: "SAN BORJA",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Distribucion de equipos electronicos",
      registryAgeDays: 9,
    },
    executiveId: EXECUTIVES.ELENA,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: BACK_OFFICE.GABRIEL,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 14,
    reservationOffsetDays: 4,
    current: current("INTERBANK", 2.55, 2.95, 70_000, 180, "BCP", 3),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P1",
      "DISPONIBLE",
      "Disponible, listo para proponer tarifa competitiva",
      12,
    ),
    proposals: [
      proposal(1, 1.0, 2.5, "revision_requested", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 9,
        decidedOffsetDays: 8,
      }),
      proposal(2, 0.88, 2.25, "pending", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 6,
      }),
    ],
  },

  // ── SETUP (rate accepted, registering venues) ───────────────────────────────
  {
    key: "setup-p1-logistica",
    org: {
      ruc: "20394809218",
      legalName: "LOGISTICA CENTRAL SA",
      address: "AV. NICOLAS ARRIOLA NRO. 2815",
      district: "LA VICTORIA",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.storage,
      lineOfBusiness: "Almacenamiento y deposito",
      registryAgeDays: 21,
    },
    executiveId: EXECUTIVES.FERNANDA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "SETUP",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 21,
    current: current("BBVA", 2.75, 3.1, 120_000, 260, "SCOTIABANK", 6),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P1",
      "DISPONIBLE",
      "Gran volumen, prioridad alta",
      19,
    ),
    proposals: [
      proposal(1, 0.85, 2.2, "accepted", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 18,
        decidedOffsetDays: 16,
        acceptedBy: EXECUTIVES.FERNANDA,
      }),
    ],
    advances: [{ to: "SETUP", offsetDays: 16 }],
  },
  {
    key: "setup-p2-boreal",
    org: {
      ruc: "20566778899",
      legalName: "IMPORTACIONES BOREAL EIRL",
      address: "CAL. MORELLI NRO. 181",
      district: "SAN BORJA",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Importacion de accesorios",
      registryAgeDays: 18,
    },
    executiveId: EXECUTIVES.ISABELLA,
    createdBy: SUPERVISORS.MARIANA,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "SETUP",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 19,
    current: current("BCP", 2.7, 3.0, 68_000, 165, "BCP", 3),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P2",
      "DISPONIBLE",
      "Disponible, buen potencial digital",
      17,
    ),
    proposals: [
      proposal(1, 0.9, 2.35, "accepted", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 15,
        decidedOffsetDays: 13,
        acceptedBy: EXECUTIVES.ISABELLA,
      }),
    ],
    advances: [{ to: "SETUP", offsetDays: 13 }],
    digitalPolicy: {
      linkScope: "shared",
      linkUrl: "https://pay.culqi.com/boreal",
      onlineScope: "none",
      onlineUrl: null,
      onlineCollectionMode: null,
      updatedOffsetDays: 12,
      updatedBy: EXECUTIVES.ISABELLA,
    },
  },

  // ── FULFILLMENT (won, provisioning POS) ─────────────────────────────────────
  {
    key: "fulfillment-p1-sierra",
    org: {
      ruc: "20455667788",
      legalName: "DISTRIBUIDORA SIERRA VERDE SAC",
      address: "AV. MARISCAL CASTILLA NRO. 3200",
      district: "EL TAMBO",
      province: "HUANCAYO",
      department: "JUNIN",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Distribucion de productos de consumo",
      registryAgeDays: 26,
    },
    executiveId: EXECUTIVES.CLAUDIA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: EXECUTIVES.CLAUDIA,
    stage: "FULFILLMENT",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 28,
    current: current("BBVA", 2.8, 3.1, 105_000, 240, "INTERBANK", 4),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P1",
      "DISPONIBLE",
      "Comercio consolidado, alta prioridad",
      26,
    ),
    proposals: [
      proposal(1, 0.9, 2.4, "accepted", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 24,
        decidedOffsetDays: 22,
        acceptedBy: EXECUTIVES.CLAUDIA,
      }),
    ],
    advances: [
      { to: "SETUP", offsetDays: 22 },
      { to: "FULFILLMENT", offsetDays: 14 },
    ],
    venue: {
      tradeName: "Sierra Verde El Tambo",
      posQuantity: 3,
      address: "AV. MARISCAL CASTILLA NRO. 3200",
      addressReference: "Frente al mercado modelo",
      createdOffsetDays: 16,
      createdBy: EXECUTIVES.CLAUDIA,
      accounts: [
        {
          currency: "PEN",
          bank: "BCP",
          accountType: "CORRIENTE",
          accountNumber: "194-98765432-0-11",
          cci: null,
          isSettlement: true,
        },
      ],
    },
  },
  {
    key: "fulfillment-p1-litoral",
    org: {
      ruc: "20611223344",
      legalName: "COMERCIAL LITORAL PACIFICO SRL",
      address: "AV. BOLOGNESI NRO. 745",
      district: "CHICLAYO",
      province: "CHICLAYO",
      department: "LAMBAYEQUE",
      activity: ACTIVITY.retail,
      lineOfBusiness: "Comercio minorista",
      registryAgeDays: 24,
    },
    executiveId: EXECUTIVES.JOSE,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: EXECUTIVES.JOSE,
    stage: "FULFILLMENT",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 25,
    current: current("SCOTIABANK", 2.72, 3.05, 88_000, 200, "SCOTIABANK", 3),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P1",
      "DISPONIBLE",
      "Disponible en zona norte, buen ticket",
      23,
    ),
    proposals: [
      proposal(1, 0.88, 2.3, "accepted", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 21,
        decidedOffsetDays: 19,
        acceptedBy: EXECUTIVES.JOSE,
      }),
    ],
    advances: [
      { to: "SETUP", offsetDays: 19 },
      { to: "FULFILLMENT", offsetDays: 11 },
    ],
  },

  // ── LIVE (won, transacting) ─────────────────────────────────────────────────
  {
    key: "live-andes",
    org: {
      ruc: "20219523468",
      legalName: "CONSTRUCTORA ANDES SA",
      address: "AV. BENAVIDES NRO. 1855",
      district: "MIRAFLORES",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.construction,
      lineOfBusiness: "Construccion de edificios residenciales",
      registryAgeDays: 30,
    },
    executiveId: EXECUTIVES.CLAUDIA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: EXECUTIVES.CLAUDIA,
    stage: "LIVE",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 30,
    current: current("BBVA", 2.8, 3.1, 85_000, 245.5, "INTERBANK", 4),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P1",
      "DISPONIBLE",
      "Empresa constructora consolidada con gran volumen potencial",
      29,
    ),
    proposals: [
      proposal(1, 0.95, 2.5, "accepted", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 27,
        decidedOffsetDays: 25,
        acceptedBy: EXECUTIVES.CLAUDIA,
      }),
    ],
    advances: [
      { to: "SETUP", offsetDays: 25 },
      { to: "LIVE", offsetDays: 20 },
    ],
    venue: {
      tradeName: "Andes Miraflores",
      posQuantity: 3,
      address: "AV. BENAVIDES NRO. 1855",
      addressReference: "Frente al parque central",
      createdOffsetDays: 22,
      createdBy: EXECUTIVES.CLAUDIA,
      accounts: [
        {
          currency: "PEN",
          bank: "BCP",
          accountType: "CORRIENTE",
          accountNumber: "194-12345678-0-21",
          cci: null,
          isSettlement: true,
        },
        {
          currency: "USD",
          bank: "BBVA",
          accountType: "AHORROS",
          accountNumber: "0011-0245-9988776655",
          cci: "01124500998877665522",
          isSettlement: false,
        },
      ],
    },
    digitalPolicy: {
      linkScope: "none",
      linkUrl: null,
      onlineScope: "none",
      onlineUrl: null,
      onlineCollectionMode: null,
      updatedOffsetDays: 28,
      updatedBy: EXECUTIVES.CLAUDIA,
    },
    legalRep: {
      dni: "42715983",
      names: "Daniel",
      firstSurname: "Gutierrez",
      secondSurname: "Paredes",
      email: "daniel.gutierrez@andes.pe",
      phone: "987654321",
      offsetDays: 29,
    },
  },
  {
    key: "live-aurora",
    org: {
      ruc: "20500112233",
      legalName: "SUPERMERCADOS AURORA SAC",
      address: "AV. UNIVERSITARIA NRO. 1801",
      district: "SAN MIGUEL",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.retail,
      lineOfBusiness: "Cadena de supermercados",
      registryAgeDays: 34,
    },
    executiveId: EXECUTIVES.MARINA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: EXECUTIVES.MARINA,
    stage: "LIVE",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 34,
    current: current("BCP", 2.78, 3.08, 140_000, 300, "BCP", 5),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P1",
      "DISPONIBLE",
      "Cadena consolidada, altísimo volumen",
      33,
    ),
    proposals: [
      proposal(1, 0.82, 2.15, "accepted", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 31,
        decidedOffsetDays: 29,
        acceptedBy: EXECUTIVES.MARINA,
      }),
    ],
    advances: [
      { to: "SETUP", offsetDays: 29 },
      { to: "LIVE", offsetDays: 18 },
    ],
    venue: {
      tradeName: "Aurora San Miguel",
      posQuantity: 5,
      address: "AV. UNIVERSITARIA NRO. 1801",
      addressReference: "Interior del centro comercial",
      createdOffsetDays: 24,
      createdBy: EXECUTIVES.MARINA,
      accounts: [
        {
          currency: "PEN",
          bank: "BCP",
          accountType: "CORRIENTE",
          accountNumber: "191-55667788-0-30",
          cci: null,
          isSettlement: true,
        },
      ],
    },
  },
  {
    key: "live-boreal-norte",
    org: {
      ruc: "20588990011",
      legalName: "COMERCIAL BOREAL NORTE EIRL",
      address: "AV. GRAU NRO. 990",
      district: "PIURA",
      province: "PIURA",
      department: "PIURA",
      activity: ACTIVITY.pharmacy,
      lineOfBusiness: "Cadena de boticas",
      registryAgeDays: 40,
    },
    executiveId: EXECUTIVES.ELENA,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: EXECUTIVES.ELENA,
    stage: "LIVE",
    status: "DISPONIBLE",
    priority: "P1",
    createdOffsetDays: 40,
    current: current("INTERBANK", 2.76, 3.02, 96_000, 175, "INTERBANK", 4),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P1",
      "DISPONIBLE",
      "Cadena de boticas en el norte, buen volumen",
      39,
    ),
    proposals: [
      proposal(1, 0.9, 2.4, "accepted", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 37,
        decidedOffsetDays: 35,
        acceptedBy: EXECUTIVES.ELENA,
      }),
    ],
    advances: [
      { to: "SETUP", offsetDays: 35 },
      { to: "LIVE", offsetDays: 16 },
    ],
  },

  // ── EXPIRED (reservation lapsed) ────────────────────────────────────────────
  {
    key: "expired-comercial-andina",
    org: {
      ruc: "20103176060",
      legalName: "COMERCIAL ANDINA EIRL",
      address: "AV. INDUSTRIAL NRO. 620 URB. PERU",
      district: "LIMA",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Venta al por mayor de combustibles",
      registryAgeDays: 22,
    },
    executiveId: EXECUTIVES.MATIAS,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: BACK_OFFICE.JOSEFINA,
    stage: "EXPIRED",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 22,
    current: current("BBVA", 2.6, 3.0, 40_000, 110, "BBVA", 2),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P2",
      "DISPONIBLE",
      "Disponible, reserva otorgada al ejecutivo",
      20,
    ),
    proposals: [
      proposal(1, 0.95, 2.45, "pending", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 16,
      }),
    ],
    expiredOffsetDays: 3,
  },
  {
    key: "expired-costa-azul",
    org: {
      ruc: "20522334455",
      legalName: "INVERSIONES COSTA AZUL SRL",
      address: "AV. SANTA ROSA NRO. 412",
      district: "TRUJILLO",
      province: "TRUJILLO",
      department: "LA LIBERTAD",
      activity: ACTIVITY.restaurant,
      lineOfBusiness: "Restaurante turistico",
      registryAgeDays: 19,
    },
    executiveId: EXECUTIVES.SOFIA,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: BACK_OFFICE.GABRIEL,
    stage: "EXPIRED",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 19,
    current: current("SCOTIABANK", 2.65, 2.98, 33_000, 85, "SCOTIABANK", 1),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P2",
      "DISPONIBLE",
      "Disponible con reserva, seguimiento pendiente",
      17,
    ),
    expiredOffsetDays: 2,
  },

  // ── CLOSED_LOST (executive closed the quotation) ────────────────────────────
  {
    key: "closed-lost-rate",
    org: {
      ruc: "20499001122",
      legalName: "DISTRIBUIDORA HORIZONTE SAC",
      address: "AV. VENEZUELA NRO. 2450",
      district: "BREÑA",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.wholesale,
      lineOfBusiness: "Distribucion de productos de limpieza",
      registryAgeDays: 15,
    },
    executiveId: EXECUTIVES.LUCIA,
    createdBy: SUPERVISORS.DIEGO,
    updatedBy: EXECUTIVES.LUCIA,
    stage: "CLOSED_LOST",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 17,
    current: current("BCP", 2.7, 3.05, 55_000, 140, "BCP", 2),
    review: review(
      BACK_OFFICE.JOSEFINA,
      "P2",
      "DISPONIBLE",
      "Disponible, negociación de tarifa",
      15,
    ),
    proposals: [
      proposal(1, 1.0, 2.6, "revision_requested", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 12,
        decidedOffsetDays: 10,
      }),
      proposal(2, 0.95, 2.45, "revision_requested", {
        proposedBy: BACK_OFFICE.JOSEFINA,
        proposedOffsetDays: 8,
        decidedOffsetDays: 6,
      }),
    ],
    close: {
      reason: "RATE",
      note: "El cliente pedía una tarifa por debajo del piso",
      by: EXECUTIVES.LUCIA,
      offsetDays: 4,
    },
  },
  {
    key: "closed-lost-other-channel",
    org: {
      ruc: "20455112299",
      legalName: "COMERCIAL DEL VALLE EIRL",
      address: "AV. LOS PROCERES NRO. 560",
      district: "SAN JUAN DE LURIGANCHO",
      province: "LIMA",
      department: "LIMA",
      activity: ACTIVITY.retail,
      lineOfBusiness: "Comercio minorista de electrodomesticos",
      registryAgeDays: 13,
    },
    executiveId: EXECUTIVES.PABLO,
    createdBy: SUPERVISORS.NICOLAS,
    updatedBy: EXECUTIVES.PABLO,
    stage: "CLOSED_LOST",
    status: "DISPONIBLE",
    priority: "P2",
    createdOffsetDays: 13,
    current: current("BBVA", 2.68, 3.0, 47_000, 125, "BBVA", 2),
    review: review(
      BACK_OFFICE.GABRIEL,
      "P2",
      "DISPONIBLE",
      "Disponible, en evaluación comercial",
      11,
    ),
    proposals: [
      proposal(1, 0.95, 2.45, "revision_requested", {
        proposedBy: BACK_OFFICE.GABRIEL,
        proposedOffsetDays: 8,
        decidedOffsetDays: 6,
      }),
    ],
    close: {
      reason: "OTHER_CHANNEL_QUOTE",
      note: "El cliente cerró con otro canal de Culqi",
      by: EXECUTIVES.PABLO,
      offsetDays: 3,
    },
  },
];

export type LeadSeedKey = (typeof LEAD_SPECS)[number]["key"];

function current(
  provider: string,
  debitRate: number,
  creditRate: number,
  gpv: number,
  ticket: number,
  settlementBank: SettlementBank,
  posCount: number,
): LeadCurrent {
  return {
    provider,
    debitRate,
    creditRate,
    gpv,
    ticket,
    settlementBank,
    posCount,
  };
}

function review(
  by: UserId,
  priority: LeadPriority,
  status: LeadStatus,
  reason: string,
  offsetDays: number,
): ReviewSpec {
  return { by, reason, status, priority, toStage: "PRICING", offsetDays };
}

function proposal(
  round: number,
  debitRate: number,
  creditRate: number,
  outcome: RateProposalSpec["outcome"],
  extra: {
    proposedBy: UserId;
    proposedOffsetDays: number;
    decidedOffsetDays?: number;
    acceptedBy?: UserId;
  },
): RateProposalSpec {
  return {
    round,
    paybackPricing: 1.2,
    debitRate,
    creditRate,
    foreignRate: 1.7,
    fee: 18.0,
    currency: "PEN",
    outcome,
    ...extra,
  };
}
