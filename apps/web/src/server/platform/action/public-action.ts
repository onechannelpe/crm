export async function executePublicServerFunction<T>(
  execute: () => Promise<T>,
): Promise<T> {
  return execute();
}
