import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  text: "#1f2937",
  muted: "#4b5563",
  accent: "#1e3a5f",
  sidebar: "#f3f4f6",
  rule: "#d1d5db",
};

export const base = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: colors.text, lineHeight: 1.35 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: colors.accent },
  title: { fontSize: 11, color: colors.muted, marginTop: 2 },
  h2: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  h3: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: colors.muted },
  p: { marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  block: { marginBottom: 6 },
});
