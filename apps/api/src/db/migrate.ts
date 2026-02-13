import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log("Running migrations...");

  const sql = readFileSync(
    resolve(__dirname, "migrations/001_initial.sql"),
    "utf-8"
  );

  await pool.query(sql);

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
