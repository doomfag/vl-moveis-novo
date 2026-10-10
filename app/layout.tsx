import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/components/store-context";
import { Header, Footer, Chat, CompareDock } from "@/components/shell";
import "./globals.css";
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#c9470a",
};
export const metadata: Metadata = {
  // The site supplies its own dark theme; avoid a second image/color transformation.
  other: { "darkreader-lock": "native-theme" },
  title: {
    default: "VL Móveis",
    template: "%s | VL Móveis",
  },
  description:
    "Móveis, colchões Ortobom, bases, cabeceiras e travesseiros. Atendimento em Sepetiba e Campo Grande, Rio de Janeiro.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>
          <a className="skip-link" href="#conteudo">
            Pular para o conteúdo
          </a>
          <Header />
          {children}
          <Footer />
          <CompareDock />
          <Chat />
        </StoreProvider>
      </body>
    </html>
  );
}
