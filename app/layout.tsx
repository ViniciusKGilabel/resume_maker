import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Maker",
  description: "Monte, melhore e personalize seu currículo. Exporta PDF legível por qualquer leitor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-100 text-zinc-900">{children}</body>
    </html>
  );
}
