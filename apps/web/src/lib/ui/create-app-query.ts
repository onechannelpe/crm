import { createResource } from "solid-js";

export function createAppQuery<T>(fetcher: () => Promise<T>, initialValue: T) {
  const [resource, controls] = createResource(
    () => true,
    async () => fetcher(),
    { initialValue, ssrLoadFrom: "initial" },
  );

  const current = () => resource.latest ?? initialValue;

  return [current, controls] as const;
}
