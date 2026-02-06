import fs from "node:fs";
import { hashPassword } from "../auth/password";
import { db } from "./client";

export async function seedDatabase() {
  const schema = fs.readFileSync("src/lib/db/schema.sql", "utf-8");
  db.run(schema);

  const userCount = db.query("SELECT count(*) as count FROM user").get() as any;
  if (userCount.count > 0) return;

  console.log("Seeding initial data...");
  const adminPwd = await hashPassword(process.env.ADMIN_PASSWORD!);
  const agentPwd = await hashPassword(process.env.AGENT_PASSWORD!);

  const insertUser = db.prepare(`
    INSERT INTO user (email, password_hash, name, role, status, created_at)
    VALUES ($email, $pwd, $name, $role, 'Activo', $date)
  `);

  insertUser.run({
    $email: process.env.ADMIN_EMAIL!,
    $pwd: adminPwd,
    $name: "David D.",
    $role: "Admin",
    $date: Date.now(),
  });

  insertUser.run({
    $email: process.env.AGENT_EMAIL!,
    $pwd: agentPwd,
    $name: "Alex D.",
    $role: "Agente",
    $date: Date.now(),
  });

  seedEntities();
  console.log("Database seeded.");
}

function seedEntities() {
  const insert = db.prepare(`
    INSERT INTO entity (type, name, identifier, initials, role_or_industry, status, phone, location)
    VALUES ($type, $name, $id, $init, $role, 'Activo', $phone, $loc)
  `);

  insert.run({
    $type: "EMPRESA",
    $name: "INVERSIONES PERUANAS S.A.C.",
    $id: "20556677889",
    $init: "IP",
    $role: "Finanzas",
    $phone: "998-554-112",
    $loc: "Lima",
  });

  insert.run({
    $type: "PERSONA",
    $name: "Juan Pérez",
    $id: "44556677",
    $init: "JP",
    $role: "Gerente",
    $phone: "987-654-321",
    $loc: "Arequipa",
  });
}
