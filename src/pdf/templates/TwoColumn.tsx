import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Resume, ResumeLanguage } from "@/src/types/resume";
import { base, colors } from "../theme";
import { labels } from "../labels";
import { Certifications, Education, Experiences, Summary, contactLines } from "./shared";

const s = StyleSheet.create({
  page: { ...base.page, flexDirection: "row-reverse", padding: 0 },
  main: { flex: 1, paddingTop: 32, paddingBottom: 32, paddingHorizontal: 26 },
  side: { width: 168, backgroundColor: colors.sidebar, paddingTop: 32, paddingBottom: 32, paddingHorizontal: 16 },
  sideH2: { ...base.h2, marginTop: 12 },
  chip: { marginBottom: 2 },
});

/**
 * Duas colunas: lateral (contato, skills, idiomas) e principal (resumo, experiência, formação, certificados).
 * A coluna principal vem primeiro na árvore para que leitores de PDF/ATS extraiam o texto na ordem certa;
 * row-reverse a posiciona à direita visualmente.
 */
export function TwoColumn({ resume, language }: { resume: Resume; language: ResumeLanguage }) {
  const l = labels(language);
  const c = resume.contact;
  return (
    <Document title={c.name || "Resume"} author={c.name} subject={c.title} language={language}>
      <Page size="A4" style={s.page}>
        <View style={s.main}>
          <Text style={base.name}>{c.name}</Text>
          {c.title ? <Text style={base.title}>{c.title}</Text> : null}
          <Summary resume={resume} l={l} />
          <Experiences resume={resume} l={l} />
          <Education resume={resume} l={l} />
          <Certifications resume={resume} l={l} />
        </View>
        <View style={s.side}>
          <Text style={s.sideH2}>{l.contact}</Text>
          {contactLines(resume).map((line, i) => (
            <Text key={i} style={s.chip}>{line}</Text>
          ))}
          {resume.skills.length ? (
            <View>
              <Text style={s.sideH2}>{l.skills}</Text>
              {resume.skills.map((sk, i) => (
                <Text key={i} style={s.chip}>{sk}</Text>
              ))}
            </View>
          ) : null}
          {resume.languages.length ? (
            <View>
              <Text style={s.sideH2}>{l.languages}</Text>
              {resume.languages.map((lg, i) => (
                <Text key={i} style={s.chip}>{[lg.name, lg.level].filter(Boolean).join(" – ")}</Text>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
