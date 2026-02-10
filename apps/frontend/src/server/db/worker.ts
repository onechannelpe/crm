import {
  createOnMessageCallback,
  defaultCreateDatabaseFn,
} from "kysely-bun-worker";

createOnMessageCallback(async (fileName, opt) => {
  const db = await defaultCreateDatabaseFn(fileName, opt);

  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA cache_size = -32000");
  db.run("PRAGMA mmap_size = 536870912");

  return db;
});
