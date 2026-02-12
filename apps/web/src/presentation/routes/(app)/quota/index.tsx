import { createAsync } from "@solidjs/router";
import { AllocateQuotaForm } from "~/presentation/features/quota/allocate-quota-form";
import { getTeamExecutives, allocateQuota } from "~/presentation/actions/quota";

export default function QuotaPage() {
  const executives = createAsync(() => getTeamExecutives());

  const handleAllocate = async (userId: number, amount: number) => {
    await allocateQuota(userId, amount);
  };

  return (
    <div class="space-y-6 max-w-2xl">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de Cuotas</h1>
        <p class="text-sm text-gray-500 mt-1">
          Asigna cuotas diarias a tus ejecutivos
        </p>
      </div>

      <AllocateQuotaForm
        executives={executives() || []}
        onAllocate={handleAllocate}
      />
    </div>
  );
}
