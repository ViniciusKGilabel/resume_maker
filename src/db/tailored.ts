import { randomUUID } from "node:crypto";
import { getDb, now } from "./connection";
import { normalizeResume, type Resume } from "@/src/types/resume";

export interface TailoredRow {
  id: string;
  resumeId: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  links: string[];
  provider: string;
  data: Resume;
  createdAt: string;
}

type Raw = {
  id: string; resume_id: string; company: string; job_title: string; job_description: string;
  links: string; provider: string; data: string; created_at: string;
};

function fromRaw(r: Raw): TailoredRow {
  return {
    id: r.id,
    resumeId: r.resume_id,
    company: r.company,
    jobTitle: r.job_title,
    jobDescription: r.job_description,
    links: JSON.parse(r.links),
    provider: r.provider,
    data: normalizeResume(JSON.parse(r.data)),
    createdAt: r.created_at,
  };
}

export const tailoredRepo = {
  listByResume(resumeId: string): TailoredRow[] {
    const rows = getDb().prepare("SELECT * FROM tailored_resumes WHERE resume_id = ? ORDER BY created_at DESC").all(resumeId) as Raw[];
    return rows.map(fromRaw);
  },

  get(id: string): TailoredRow | null {
    const r = getDb().prepare("SELECT * FROM tailored_resumes WHERE id = ?").get(id) as Raw | undefined;
    return r ? fromRaw(r) : null;
  },

  create(input: { resumeId: string; company: string; jobTitle: string; jobDescription: string; links?: string[]; provider?: string; data: Resume }): TailoredRow {
    const id = randomUUID();
    getDb()
      .prepare(
        "INSERT INTO tailored_resumes (id, resume_id, company, job_title, job_description, links, provider, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(id, input.resumeId, input.company, input.jobTitle, input.jobDescription, JSON.stringify(input.links ?? []), input.provider ?? "", JSON.stringify(normalizeResume(input.data)), now());
    return this.get(id)!;
  },

  remove(id: string): boolean {
    return getDb().prepare("DELETE FROM tailored_resumes WHERE id = ?").run(id).changes > 0;
  },
};
