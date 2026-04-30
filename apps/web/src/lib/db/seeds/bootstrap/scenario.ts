export type BaseDataScenario = {
  generatedAtMs: number;
};

export function buildBaseDataScenario(nowMs: number): BaseDataScenario {
  return { generatedAtMs: nowMs };
}
