import { Hono } from "hono";
import { requireRole } from "../auth/rbac";
import { getContactInteractions, logInteraction } from "./logger";

const interactions = new Hono();

interactions.post("/", requireRole(["executive"]), async (c) => {
  const userId = c.get("userId");
  const { contactId, outcome, notes, durationSeconds } = await c.req.json();

  await logInteraction(contactId, userId, outcome, notes, durationSeconds);
  return c.json({ success: true });
});

interactions.get(
  "/contact/:id",
  requireRole(["executive", "supervisor"]),
  async (c) => {
    const contactId = parseInt(c.req.param("id"), 10);
    const logs = await getContactInteractions(contactId);
    return c.json(logs);
  },
);

export default interactions;
