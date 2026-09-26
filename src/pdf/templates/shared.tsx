import { Text, View } from "@react-pdf/renderer";
import type { Resume } from "@/src/types/resume";
import { base } from "../theme";
import { period, type Labels } from "../labels";
import { measureTextWidth } from "../textMeasure";

export function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((b, i) => (
        <View key={i} style={base.bulletRow} wrap={false}>
          <Text style={base.bulletDot}>•</Text>
          <Text style={base.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function Experiences({ resume, l }: { resume: Resume; l: Labels }) {
  if (!resume.experiences.length) return null;
  return (
    <View>
      <Text style={base.h2}>{l.experience}</Text>
      {resume.experiences.map((e, i) => (
        <View key={i} style={base.block}>
          <Text style={base.h3}>{[e.role, e.company].filter(Boolean).join(" · ")}</Text>
          <Text style={base.meta}>{[period(e.start, e.end, l), e.location].filter(Boolean).join(" · ")}</Text>
          <Bullets items={e.bullets} />
        </View>
      ))}
    </View>
  );
}

export function Education({ resume, l }: { resume: Resume; l: Labels }) {
  if (!resume.education.length) return null;
  return (
    <View>
      <Text style={base.h2}>{l.education}</Text>
      {resume.education.map((e, i) => (
        <View key={i} style={base.block} wrap={false}>
          <Text style={base.h3}>{e.degree}</Text>
          <Text style={base.meta}>{[e.institution, period(e.start, e.end, l)].filter(Boolean).join(" · ")}</Text>
        </View>
      ))}
    </View>
  );
}

export function Certifications({ resume, l }: { resume: Resume; l: Labels }) {
  if (!resume.certifications.length) return null;
  return (
    <View>
      <Text style={base.h2}>{l.certifications}</Text>
      {resume.certifications.map((c, i) => (
        <Text key={i} style={base.p}>
          {[c.name, c.issuer, c.year].filter(Boolean).join(" · ")}
        </Text>
      ))}
    </View>
  );
}

export function Summary({ resume, l }: { resume: Resume; l: Labels }) {
  if (!resume.summary.trim()) return null;
  return (
    <View>
      <Text style={base.h2}>{l.summary}</Text>
      <Text>{resume.summary}</Text>
    </View>
  );
}

export function contactLines(resume: Resume): string[] {
  const c = resume.contact;
  return [c.email, c.phone, c.location, c.linkedin, c.github, c.website].map((s) => s.trim()).filter(Boolean);
}

const BREAK_AFTER = /(?<=[/.\-_@])/;

/**
 * Quebra manualmente (com \n) strings longas sem espaço, como URLs, para caberem
 * em `maxWidth` (mesma unidade do PDF, ex. pt). O textkit do react-pdf não quebra
 * "palavras" sem espaço e, se forçado via hyphenationCallback, insere um "-"
 * visível — então a quebra é feita aqui, no texto, usando a largura real medida
 * na fonte embutida (measureTextWidth) e aproveitando separadores que já existem
 * nela (/ . - _ @), para acompanhar o tamanho de fato da coluna.
 */
export function wrapLongToken(value: string, maxWidth: number, fontSize: number, fontFamily = "Lato"): string {
  if (measureTextWidth(value, fontSize, fontFamily) <= maxWidth) return value;
  const segments = value.split(BREAK_AFTER);
  const lines: string[] = [];
  let current = "";
  for (const seg of segments) {
    const candidate = current + seg;
    if (current && measureTextWidth(candidate, fontSize, fontFamily) > maxWidth) {
      lines.push(current);
      current = seg;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}
