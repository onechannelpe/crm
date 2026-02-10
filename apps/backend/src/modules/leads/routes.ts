import { Hono } from "hono";
import type { AppVariables } from "../../types";
import { requireRole } from "../auth/rbac";
import {
  assignLeads,
  completeAssignment,
  getActiveAssignments,
} from "./assignment";
import { getLeadDetails, searchLeads } from "./engine-client";

const leads = new Hono<{ Variables: AppVariables }>();

leads.get("/active", requireRole(["executive"]), async (c) => {
  const userId = c.get("userId");
  const assignments = await getActiveAssignments(userId);

  const withDetails = await Promise.all(
    assignments.map(async (a) => ({
      ...a,
      contact: await getLeadDetails(a.contact_id),
    })),
  );

  return c.json(withDetails);
});

leads.post("/request", requireRole(["executive"]), async (c) => {
  const userId = c.get("userId");
  const { bufferSize } = await c.req.json();

  const newLeads = await assignLeads(userId, bufferSize);
  return c.json(newLeads);
});

leads.post("/:id/complete", requireRole(["executive"]), async (c) => {
  const assignmentId = parseInt(c.req.param("id"), 10);
  const userId = c.get("userId");

  await completeAssignment(assignmentId, userId);
  return c.json({ success: true });
});

leads.get("/search", requireRole(["executive", "supervisor"]), async (c) => {
  const query = c.req.query("q") || "";
  const filters = {
    industry: c.req.query("industry"),
    city: c.req.query("city"),
  };

  const results = await searchLeads(query, filters);
  return c.json(results);
});

export default leads;
