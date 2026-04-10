// Vitest's BenchmarkRunner currently doesn't execute beforeAll/afterAll for bench suites.
// Keep this runner until upstream lands the bench API redesign:
// - https://github.com/vitest-dev/vitest/issues/5075
// - https://github.com/vitest-dev/vitest/discussions/7850
import { BenchmarkRunner, TestRunner } from "vitest";

type Suite = Parameters<BenchmarkRunner["runSuite"]>[0];

async function callSuiteHooks(
  suite: Suite,
  type: "beforeAll" | "afterAll",
): Promise<void> {
  for (const hook of TestRunner.getSuiteHooks(suite)[type]) {
    await hook(suite);
  }

  for (const task of suite.tasks) {
    if (task.type === "suite") {
      await callSuiteHooks(task as Suite, type);
    }
  }
}

export default class BenchRunner extends BenchmarkRunner {
  async runSuite(suite: Suite): Promise<void> {
    await callSuiteHooks(suite, "beforeAll");
    try {
      await super.runSuite(suite);
    } finally {
      await callSuiteHooks(suite, "afterAll");
    }
  }
}
