// BenchmarkRunner skips beforeAll/afterAll for bench suites, so this runner
// invokes suite hooks around the normal bench execution:
// - https://github.com/vitest-dev/vitest/issues/5075
// - https://github.com/vitest-dev/vitest/discussions/7850
import { BenchmarkRunner, TestRunner } from "vitest";

type Suite = Parameters<BenchmarkRunner["runSuite"]>[0];

function getChildSuites(suite: Suite): Suite[] {
  return suite.tasks.filter((task): task is Suite => task.type === "suite");
}

async function runBeforeAllHooks(suite: Suite): Promise<void> {
  const hooks = TestRunner.getSuiteHooks(suite).beforeAll;
  for (const hook of hooks) {
    await hook(suite);
  }

  for (const childSuite of getChildSuites(suite)) {
    await runBeforeAllHooks(childSuite);
  }
}

async function runAfterAllHooks(suite: Suite): Promise<void> {
  for (const childSuite of getChildSuites(suite)) {
    await runAfterAllHooks(childSuite);
  }

  const hooks = TestRunner.getSuiteHooks(suite).afterAll;
  for (const hook of hooks.toReversed()) {
    await hook(suite);
  }
}

export default class BenchRunner extends BenchmarkRunner {
  async runSuite(suite: Suite): Promise<void> {
    await runBeforeAllHooks(suite);
    try {
      await super.runSuite(suite);
    } finally {
      await runAfterAllHooks(suite);
    }
  }
}
