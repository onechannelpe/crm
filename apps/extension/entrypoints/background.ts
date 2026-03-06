import { registerRuntime } from "@/src/background/runtime";

export default defineBackground(() => {
  registerRuntime();
});
