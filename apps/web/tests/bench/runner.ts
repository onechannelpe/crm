// Vitest's NodeBenchmarkRunner never calls beforeAll/afterAll on bench suites
// (tracked upstream: https://github.com/vitest-dev/vitest/issues/5075).
// When the bench API redesign ships (https://github.com/vitest-dev/vitest/discussions/7850),
// bench() will run inside test() and this file can be deleted.
import { NodeBenchmarkRunner } from "vitest/runners";
import { getHooks } from "vitest/suite";

type Suite = Parameters<NodeBenchmarkRunner["runSuite"]>[0];

async function callSuiteHooks(
  suite: Suite,
  type: "beforeAll" | "afterAll",
): Promise<void> {
  for (const hook of getHooks(suite)[type]) {
    await hook(suite);
  }

  for (const task of suite.tasks) {
    if (task.type === "suite") {
      await callSuiteHooks(task as Suite, type);
    }
  }
}

export default class BenchRunner extends NodeBenchmarkRunner {
  async runSuite(suite: Suite): Promise<void> {
    await callSuiteHooks(suite, "beforeAll");
    try {
      await super.runSuite(suite);
    } finally {
      await callSuiteHooks(suite, "afterAll");
    }
  }
}
