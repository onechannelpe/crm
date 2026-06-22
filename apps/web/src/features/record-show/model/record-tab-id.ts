// One tab-id type for every record surface. Which ids actually appear is decided
// per context by the registry's `kinds` + `stageGate`, not by separate id unions.
export type RecordTabId =
  | "registro"
  | "resumen"
  | "datos"
  | "afiliacion"
  | "notas"
  | "actividad"
  | "archivos";
