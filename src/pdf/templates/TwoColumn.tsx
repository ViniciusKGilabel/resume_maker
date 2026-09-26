import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Resume, ResumeLanguage } from "@/src/types/resume";
import { base } from "../theme";
import { labels } from "../labels";
import { Certifications, Education, Experiences, Summary, contactLines, wrapLongToken } from "./shared";

const SIDE_WIDTH = 168;
const SIDE_PADDING_H = 16;
const SIDE_CONTENT_WIDTH = SIDE_WIDTH - SIDE_PADDING_H * 2;

const s = StyleSheet.create({
  page: { ...base.page, flexDirection: "row-reverse", padding: 0 },
  main: { flex: 1, paddingTop: 32, paddingBottom: 32, paddingHorizontal: 26 },
  side: { width: SIDE_WIDTH, paddingTop: 32, paddingBottom: 32, paddingHorizontal: SIDE_PADDING_H },
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
  const { sidebarBg, sidebarText, mainBg, mainText } = resume.style;
  return (
    <Document title={c.name || "Resume"} author={c.name} subject={c.title} language={language}>
      <Page size="A4" style={s.page}>
        <View style={[s.main, { backgroundColor: mainBg, color: mainText }]}>
          <Text style={[base.name]}>{c.name}</Text>
          {c.title ? <Text style={base.title}>{c.title}</Text> : null}
          <Summary resume={resume} l={l} />
          <Experiences resume={resume} l={l} />
          <Education resume={resume} l={l} />
          <Certifications resume={resume} l={l} />
        </View>
        <View style={[s.side, { backgroundColor: sidebarBg, color: sidebarText }]}>
          <Text style={s.sideH2}>{l.contact}</Text>
          {contactLines(resume).map((line, i) => (
            <Text key={i} style={s.chip}>{wrapLongToken(line, SIDE_CONTENT_WIDTH, base.page.fontSize)}</Text>
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
