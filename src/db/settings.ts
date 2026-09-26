import { getDb } from "./connection";

export const settingsRepo = {
  get<T>(key: string, fallback: T): T {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): void {
    getDb()
      .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, JSON.stringify(value));
  },

  /** Versões antigas gravavam providers e API keys em texto puro na chave "app". */
  purgeLegacyApp(): void {
    getDb().prepare("DELETE FROM settings WHERE key = 'app'").run();
  },

  getAll(): Record<string, unknown> {
    const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  },
};
