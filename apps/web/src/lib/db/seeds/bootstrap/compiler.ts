import type { BaseDataScenario } from "./scenario";

export type CompiledBaseDataScenario = BaseDataScenario;

export function compileBaseDataScenario(
  scenario: BaseDataScenario,
): CompiledBaseDataScenario {
  return scenario;
}
