export const SUP1 = 2;
export const SUP2 = 8;
export const BO1 = 4;
export const BO2 = 10;

export const EXEC_CAMILA = 3;
export const EXEC_PATRICIA = 5;
export const EXEC_ROBERTO = 6;
export const EXEC_ANDREA = 9;
export const EXEC_RENATO = 15;
export const EXEC_DANIELA = 16;
export const EXEC_GABRIEL = 17;

export const ORGANIZATIONS = {
  pending: {
    ruc: "20103615080",
    name: "SERVICIOS GENERALES ANDINA SAC",
    address: "CAL. LOS NEGOCIOS NRO. 431 URB. RESIDENCIAL SAN ISIDRO",
    district: "SAN ISIDRO",
    department: "LIMA",
  },
  needs: {
    ruc: "20103176060",
    name: "COMERCIAL ANDINA EIRL",
    address: "AV. INDUSTRIAL NRO. 620 URB. PERU",
    district: "LIMA",
    department: "LIMA",
  },
  ready: {
    ruc: "20538856674",
    name: "DISTRIBUIDORA NORTE PERU SAC",
    address: "CAL. JOSE DE LA RIVA AGUERO NRO. 1023",
    district: "LOS OLIVOS",
    department: "LIMA",
  },
  quoted: {
    ruc: "20542245671",
    name: "INVERSIONES PACIFICO SRL",
    address: "AV. EL SOL NRO. 123 PISO 3",
    district: "CUSCO",
    department: "CUSCO",
  },
  forSale: {
    ruc: "20394809218",
    name: "LOGISTICA CENTRAL SA",
    address: "AV. NICOLAS ARRIOLA NRO. 2815",
    district: "LA VICTORIA",
    department: "LIMA",
  },
  converted: {
    ruc: "20219523468",
    name: "CONSTRUCTORA ANDES SA",
    address: "AV. BENAVIDES NRO. 1855",
    district: "MIRAFLORES",
    department: "LIMA",
  },
  rejected: {
    ruc: "20353745400",
    name: "TRANSPORTES LIMA NORTE EIRL",
    address: "AV. TUPAC AMARU KM. 14.5",
    district: "COMAS",
    department: "LIMA",
  },
} as const;

export const ORGANIZATION_KEYS = [
  "pending",
  "needs",
  "ready",
  "quoted",
  "forSale",
  "converted",
  "rejected",
] as const;

export type OrganizationSeedKey = keyof typeof ORGANIZATIONS;

export const LEADS = [
  {
    key: "pending",
    organizationKey: "pending",
    executiveId: EXEC_CAMILA,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdBy: SUP1,
    updatedBy: null,
    createdOffsetDays: 1,
    updatedOffsetDays: 1,
  },
  {
    key: "needs",
    organizationKey: "needs",
    executiveId: EXEC_PATRICIA,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P2",
    createdBy: SUP1,
    updatedBy: BO1,
    createdOffsetDays: 4,
    updatedOffsetDays: 3,
  },
  {
    key: "ready",
    organizationKey: "ready",
    executiveId: EXEC_ROBERTO,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P1",
    createdBy: SUP1,
    updatedBy: BO1,
    createdOffsetDays: 7,
    updatedOffsetDays: 6,
  },
  {
    key: "quoted",
    organizationKey: "quoted",
    executiveId: EXEC_ANDREA,
    stage: "PRICING",
    status: "DISPONIBLE",
    priority: "P2",
    createdBy: SUP2,
    updatedBy: BO2,
    createdOffsetDays: 14,
    updatedOffsetDays: 10,
  },
  {
    key: "forSale",
    organizationKey: "forSale",
    executiveId: EXEC_RENATO,
    stage: "SETUP",
    status: "DISPONIBLE",
    priority: "P1",
    createdBy: SUP1,
    updatedBy: BO1,
    createdOffsetDays: 21,
    updatedOffsetDays: 15,
  },
  {
    key: "converted",
    organizationKey: "converted",
    executiveId: EXEC_DANIELA,
    stage: "LIVE",
    status: "DISPONIBLE",
    priority: "P1",
    createdBy: SUP1,
    updatedBy: EXEC_DANIELA,
    createdOffsetDays: 30,
    updatedOffsetDays: 20,
  },
  {
    key: "rejected",
    organizationKey: "rejected",
    executiveId: EXEC_GABRIEL,
    stage: "DISQUALIFIED",
    status: "CARTERIZADO",
    priority: "SIN RESULTADO",
    createdBy: SUP2,
    updatedBy: BO2,
    createdOffsetDays: 3,
    updatedOffsetDays: 2,
  },
] as const;

export type LeadSeedKey = (typeof LEADS)[number]["key"];
