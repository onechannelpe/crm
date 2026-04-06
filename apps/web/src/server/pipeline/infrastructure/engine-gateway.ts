import { engineClient } from "~/server/shared/composition-root";

export function createEngineGateway() {
  return {
    async enrichByRuc(ruc: string) {
      const result = await engineClient.search("ruc", ruc, 1);
      if (!result.ok) {
        return null;
      }

      const match =
        result.value.find((candidate) => candidate.org?.ruc === ruc) ??
        result.value[0] ??
        null;

      return match
        ? {
            razonSocial: match.org?.name ?? null,
            address: match.org?.fiscal_address ?? null,
          }
        : null;
    },
  };
}
