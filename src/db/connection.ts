import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

let db: Database.Database | null = null;

export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

/** Abre (uma vez) o banco. Passe ":memory:" nos testes. */
export function getDb(filePath?: string): Database.Database {
  if (db) return db;
  const target = filePath ?? path.join(dataDir(), "resume-maker.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  db = new Database(target);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/** Fecha e descarta o singleton (usado nos testes). */
export function closeDb(): void {
  db?.close();
  db = null;
}

export function now(): string {
  return new Date().toISOString();
}
