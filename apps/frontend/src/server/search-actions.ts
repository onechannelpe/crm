import { getRequestEvent } from "solid-js/web";
import { db } from "~/lib/db/client";

export const searchEntities = async (query: string) => {
  "use server";
  const event = getRequestEvent();
  const user = event?.locals.user;

  if (!user) throw new Error("Unauthorized");

  const searchTerm = `%${query}%`;
  const results = db
    .query(`
    SELECT * FROM entity 
    WHERE name LIKE ? OR identifier LIKE ?
    LIMIT 20
  `)
    .all(searchTerm, searchTerm) as any[];

  // Logging
  const ip = event.request.headers.get("x-forwarded-for") || "unknown";
  db.run(
    `
    INSERT INTO search_log (user_id, query, results_count, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    [user.id, query, results.length, ip, Date.now()],
  );

  return results;
};

export const getEntityById = async (id: number) => {
  "use server";
  const event = getRequestEvent();
  if (!event?.locals.user) throw new Error("Unauthorized");
  return db.query("SELECT * FROM entity WHERE id = ?").get(id) as any;
};
