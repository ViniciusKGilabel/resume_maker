import { randomUUID } from "node:crypto";
import { getDb, now } from "./connection";
import { normalizeResume, type Resume, type ResumeLanguage, type TemplateId } from "@/src/types/resume";

export interface ResumeRow {
  id: string;
  name: string;
  language: ResumeLanguage;
  template: TemplateId;
  data: Resume;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeSummary {
  id: string;
  name: string;
  language: ResumeLanguage;
  template: TemplateId;
  updatedAt: string;
}

type Raw = { id: string; name: string; language: string; template: string; data: string; created_at: string; updated_at: string };

function fromRaw(r: Raw): ResumeRow {
  return {
    id: r.id,
    name: r.name,
    language: r.language as ResumeLanguage,
    template: r.template as TemplateId,
    data: normalizeResume(JSON.parse(r.data)),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const resumesRepo = {
  list(): ResumeSummary[] {
    const rows = getDb()
      .prepare("SELECT id, name, language, template, updated_at FROM resumes ORDER BY updated_at DESC")
      .all() as Omit<Raw, "data" | "created_at">[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      language: r.language as ResumeLanguage,
      template: r.template as TemplateId,
      updatedAt: r.updated_at,
    }));
  },

  get(id: string): ResumeRow | null {
    const r = getDb().prepare("SELECT * FROM resumes WHERE id = ?").get(id) as Raw | undefined;
    return r ? fromRaw(r) : null;
  },

  create(input: { name: string; language?: ResumeLanguage; template?: TemplateId; data?: Resume }): ResumeRow {
    const id = randomUUID();
    const ts = now();
    getDb()
      .prepare("INSERT INTO resumes (id, name, language, template, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, input.name, input.language ?? "pt-BR", input.template ?? "two-column", JSON.stringify(normalizeResume(input.data)), ts, ts);
    return this.get(id)!;
  },

  update(id: string, patch: Partial<{ name: string; language: ResumeLanguage; template: TemplateId; data: Resume }>): ResumeRow | null {
    const current = this.get(id);
    if (!current) return null;
    const next = {
      name: patch.name ?? current.name,
      language: patch.language ?? current.language,
      template: patch.template ?? current.template,
      data: patch.data ? normalizeResume(patch.data) : current.data,
    };
    getDb()
      .prepare("UPDATE resumes SET name = ?, language = ?, template = ?, data = ?, updated_at = ? WHERE id = ?")
      .run(next.name, next.language, next.template, JSON.stringify(next.data), now(), id);
    return this.get(id);
  },

  remove(id: string): boolean {
    return getDb().prepare("DELETE FROM resumes WHERE id = ?").run(id).changes > 0;
  },
};
