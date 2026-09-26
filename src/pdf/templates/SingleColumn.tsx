import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Resume, ResumeLanguage } from "@/src/types/resume";
import { base } from "../theme";
import { labels } from "../labels";
import { Certifications, Education, Experiences, Summary, contactLines } from "./shared";

const s = StyleSheet.create({
  page: { ...base.page, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40 },
  contact: { fontSize: 9, color: "#4b5563", marginTop: 4 },
});

/** Uma coluna, o mais simples possível. */
export function SingleColumn({ resume, language }: { resume: Resume; language: ResumeLanguage }) {
  const l = labels(language);
  const c = resume.contact;
  const { mainBg, mainText } = resume.style;
  return (
    <Document title={c.name || "Resume"} author={c.name} subject={c.title} language={language}>
      <Page size="A4" style={[s.page, { backgroundColor: mainBg, color: mainText }]}>
        <Text style={base.name}>{c.name}</Text>
        {c.title ? <Text style={base.title}>{c.title}</Text> : null}
        <Text style={s.contact}>{contactLines(resume).join("  |  ")}</Text>
        <Summary resume={resume} l={l} />
        <Experiences resume={resume} l={l} />
        {resume.skills.length ? (
          <View>
            <Text style={base.h2}>{l.skills}</Text>
            <Text>{resume.skills.join(", ")}</Text>
          </View>
        ) : null}
        <Education resume={resume} l={l} />
        <Certifications resume={resume} l={l} />
        {resume.languages.length ? (
          <View>
            <Text style={base.h2}>{l.languages}</Text>
            <Text>{resume.languages.map((lg) => [lg.name, lg.level].filter(Boolean).join(" – ")).join(", ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
