import type { AttributionConfidence, QualityIssue } from "./vocabulary";

export const ATTRIBUTION_CONFIDENCE_LABEL: Record<
  AttributionConfidence,
  string
> = {
  exact: "Exacta",
  inferred: "Inferida",
  conflict: "En conflicto",
  late: "Registro posterior",
  none: "Sin atribución",
};

export const QUALITY_ISSUE_COPY: Record<
  QualityIssue,
  { label: string; detail: string }
> = {
  conflict: {
    label: "Atribución en conflicto",
    detail:
      "Hay ventas de este RUC asociadas a vendedores distintos. Una asociación puede corresponder a otro dispositivo.",
  },
  late: {
    label: "Cliente registrado después de la venta",
    detail:
      "El cliente se registró después de la venta, por lo que no se le asigna automáticamente.",
  },
  none: {
    label: "Sin señales de atribución",
    detail:
      "No hay un cliente registrado ni una entrega con serie que permitan atribuir la venta.",
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
};
