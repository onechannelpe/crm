import type { CloseReason } from "./vocabulary";

const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
  RATE: "Tasa",
  CULQI_REFERENCES: "Mala experiencia / referencias de Culqi",
  DECLINED_TAX_REPORT: "No quiere dar reporte tributario / de ventas",
  QUOTE_DELAYS: "Demoras para entregar cotizaciones",
  BCP_REFUSAL: "No quiere trabajar con BCP (problemas / demoras)",
  OTHER_CHANNEL_QUOTE: "Cotización de otro canal",
  POS_COST_REFUSAL: "No quiere pagar por POS",
};

export function describeCloseReason(reason: CloseReason): string {
  return CLOSE_REASON_LABELS[reason];
}
