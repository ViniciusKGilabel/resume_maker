import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
  // O worker do pdf.js é carregado dinamicamente e o traçado não o detecta.
  outputFileTracingIncludes: {
    "/api/import/pdf": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  // Sem otimização de imagens: não usamos next/image. O Dockerfile remove o sharp da imagem.
  images: { unoptimized: true },
};

export default nextConfig;
