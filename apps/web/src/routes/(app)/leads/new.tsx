import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";

export default function NewLeadPage() {
  const navigate = useNavigate();

  onMount(() => {
    navigate("/leads", { replace: true });
  });

  return null;
}
