"use client";
import type { Resume, ResumeLanguage } from "@/src/types/resume";
import { Section, Textarea } from "../ui";
import { AppearanceForm } from "./AppearanceForm";
import { ContactForm } from "./ContactForm";
import { ExperiencesForm } from "./ExperiencesForm";
import { ImportPdf } from "./ImportPdf";
import { CertificationsForm, EducationForm, LanguagesForm, SkillsForm } from "./ListForms";

export function Editor({ resume, language, onChange }: { resume: Resume; language: ResumeLanguage; onChange: (r: Resume) => void }) {
  const set = <K extends keyof Resume>(key: K, value: Resume[K]) => onChange({ ...resume, [key]: value });
  const onImported = (draft: Partial<Resume>) => {
    onChange({
      ...resume,
      ...draft,
      contact: { ...resume.contact, ...Object.fromEntries(Object.entries(draft.contact ?? {}).filter(([, v]) => v)) },
    });
  };
  return (
    <div className="space-y-3">
      <ImportPdf onImported={onImported} />
      <Section title="Contato">
        <ContactForm value={resume.contact} onChange={(c) => set("contact", c)} />
      </Section>
      <Section title="Aparência" defaultOpen={false}>
        <AppearanceForm value={resume.style} onChange={(v) => set("style", v)} />
      </Section>
      <Section title="Resumo">
        <Textarea value={resume.summary} placeholder="2 a 4 frases sobre você. A personalização por vaga reescreve isso." onChange={(e) => set("summary", e.target.value)} />
      </Section>
      <Section title="Experiência profissional" count={resume.experiences.length}>
        <ExperiencesForm value={resume.experiences} language={language} onChange={(v) => set("experiences", v)} />
      </Section>
      <Section title="Habilidades" count={resume.skills.length}>
        <SkillsForm value={resume.skills} onChange={(v) => set("skills", v)} />
      </Section>
      <Section title="Formação" count={resume.education.length} defaultOpen={false}>
        <EducationForm value={resume.education} onChange={(v) => set("education", v)} />
      </Section>
      <Section title="Certificações" count={resume.certifications.length} defaultOpen={false}>
        <CertificationsForm value={resume.certifications} onChange={(v) => set("certifications", v)} />
      </Section>
      <Section title="Idiomas" count={resume.languages.length} defaultOpen={false}>
        <LanguagesForm value={resume.languages} onChange={(v) => set("languages", v)} />
      </Section>
    </div>
  );
}
