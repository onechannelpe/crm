export type CleanupErrorHandler = (error: unknown) => void;

function reportCleanupErrorInDevelopment(error: unknown): void {
  if (import.meta.env.DEV) {
    console.error("Cleanup task failed:", error);
  }
}

export function runCleanupTasks(
  cleanupTasks: ReadonlyArray<() => void>,
  onError: CleanupErrorHandler = reportCleanupErrorInDevelopment,
): void {
  cleanupTasks.forEach((cleanupTask) => {
    try {
      cleanupTask();
    } catch (error) {
      onError(error);
    }
  });
}
