import { notFound } from "next/navigation";
import { products, product, promotions } from "@/lib/db";
import Storefront from "@/components/storefront";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const { slug = [] } = await params;
  if (slug[0] === "produto") {
    const p = product(slug[1]);
    return {
      title: p?.name || "Produto não encontrado",
      description: p?.description.slice(0, 160),
    };
  }
  const titles: Record<string, string> = {
    catalogo: "Encontre seu conforto",
    sacola: "Sua sacola",
    conta: "Sua conta",
    comparar: "Compare e escolha",
    admin: "Administração",
    lojas: "Nossas lojas",
    favoritos: "Seus favoritos",
    privacidade: "Privacidade",
    termos: "Compras e entregas",
  };
  return { title: titles[slug[0]] || "VL Móveis" };
}
export default async function Page({ params }: Props) {
  const { slug = [] } = await params;
  const page = slug[0] || "home";
  const allowed = [
    "home",
    "catalogo",
    "produto",
    "sacola",
    "conta",
    "confirmar-email",
    "reenviar-confirmacao",
    "recuperar-senha",
    "redefinir-senha",
    "comparar",
    "admin",
    "lojas",
    "favoritos",
    "privacidade",
    "termos",
  ];
  if (!allowed.includes(page) || slug.length > (page === "produto" ? 2 : 1))
    notFound();
  const p = page === "produto" ? product(slug[1]) : undefined;
  if (page === "produto" && (!p || !p.active)) notFound();
  const list = products().map(({ sourceText, ...rest }) => rest);
  return (
    <Storefront
      view={page}
      products={list}
      selected={p ? (({ sourceText, ...rest }) => rest)(p) : undefined}
      promotions={promotions().filter((p) => p.active)}
    />
  );
}
