export type InboundWhatsAppCommand = "verify" | "opt-out" | "activity";

const VERIFY_COMMAND = "/verificar";
const OPT_OUT_COMMANDS = new Set(["baja", "stop"]);

export function classifyInboundMessage(
  body: string | null,
): InboundWhatsAppCommand {
  const normalized = body?.trim().toLowerCase() ?? "";
  if (OPT_OUT_COMMANDS.has(normalized)) return "opt-out";
  if (normalized === VERIFY_COMMAND) return "verify";
  return "activity";
}
