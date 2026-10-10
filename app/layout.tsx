import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-context";
import { Header, Footer, Chat, CompareDock } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "VL Móveis | Seu lar. Seu jeito.",
    template: "%s | VL Móveis",
  },
  description:
    "Colchões Ortobom, bases, cabeceiras e conforto para sua casa. Atendimento em Sepetiba e Campo Grande, Rio de Janeiro.",
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
