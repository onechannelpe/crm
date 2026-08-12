import type { AttributionConfidence, QualityIssue } from "./vocabulary";

export const ATTRIBUTION_CONFIDENCE_LABEL: Record<
  AttributionConfidence,
  string
> = {
  exact: "Exacta",
  none: "Sin atribución",
};

export const QUALITY_ISSUE_COPY: Record<
  QualityIssue,
  { label: string; detail: string }
> = {
  no_owner: {
    label: "Sin ejecutivo",
    detail:
      "El comercio tiene GPV para este mes, pero no tenía un ejecutivo asignado en CRM.",
  },
  no_target: {
    label: "Sin proyección",
    detail:
      "El comercio facturó este mes, pero no tiene una proyección registrada.",
  },
  serial_mismatch: {
    label: "Serie no coincide con la entrega",
    detail:
      "La serie de Culqi no coincide con ninguna registrada en la entrega de este cliente.",
  },
  no_mesa: {
    label: "Sin mesa",
    detail:
      "El comercio facturó este mes, pero la venta no trae mesa asignada -- el esquema de comisiones no puede evaluarla.",
  },
};
