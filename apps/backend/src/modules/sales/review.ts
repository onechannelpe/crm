import { Hono } from "hono";
import { requireRole } from "../auth/rbac";
import { getPendingSales, getRejectedSales, getRejections } from "./queries";
import { transitionStatus } from "./workflow";

const review = new Hono();

review.post("/:id/submit", requireRole(["executive"]), async (c) => {
	const noteId = parseInt(c.req.param("id"));
	const userId = c.get("userId");

	await transitionStatus(noteId, "Pending_Back", userId);
	return c.json({ success: true });
});

review.get("/pending", requireRole(["back_office"]), async (c) => {
	const pending = await getPendingSales();
	return c.json(pending);
});

review.post("/:id/approve", requireRole(["back_office"]), async (c) => {
	const noteId = parseInt(c.req.param("id"));
	const userId = c.get("userId");

	await transitionStatus(noteId, "Approved", userId);
	return c.json({ success: true });
});

review.post("/:id/reject", requireRole(["back_office"]), async (c) => {
	const noteId = parseInt(c.req.param("id"));
	const userId = c.get("userId");
	const { rejections } = await c.req.json();

	await transitionStatus(noteId, "Rejected", userId, rejections);
	return c.json({ success: true });
});

review.get("/my-rejected", requireRole(["executive"]), async (c) => {
	const userId = c.get("userId");
	const rejected = await getRejectedSales(userId);
	return c.json(rejected);
});

review.get("/:id/rejections", async (c) => {
	const noteId = parseInt(c.req.param("id"));
	const rejections = await getRejections(noteId);
	return c.json(rejections);
});

export default review;
