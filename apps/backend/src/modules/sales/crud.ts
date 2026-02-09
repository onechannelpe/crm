import { Hono } from "hono";
import { requireRole } from "../auth/rbac";
import { db } from "../../db/client";
import { getActiveProducts } from "./products";
import { getChargeNote } from "./queries";

const crud = new Hono();

crud.get("/products", async (c) => {
  const products = await getActiveProducts();
  return c.json(products);
});

crud.post("/", requireRole(["executive"]), async (c) => {
  const userId = c.get("userId");
  const { contactId } = await c.req.json();

  const result = await db
    .insertInto("charge_notes")
    .values({
      contact_id: contactId,
      user_id: userId,
      status: "Draft",
      created_at: Date.now(),
      updated_at: Date.now(),
    })
    .executeTakeFirst();

  return c.json({ id: Number(result.insertId) });
});

crud.post("/:id/items", requireRole(["executive"]), async (c) => {
  const noteId = parseInt(c.req.param("id"));
  const { productId, quantity } = await c.req.json();

  await db
    .insertInto("charge_note_items")
    .values({ charge_note_id: noteId, product_id: productId, quantity })
    .execute();

  return c.json({ success: true });
});

crud.get("/:id", async (c) => {
  const noteId = parseInt(c.req.param("id"));
  const note = await getChargeNote(noteId);

  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json(note);
});

export default crud;
