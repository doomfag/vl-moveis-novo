export type VariantInventory = {
  priceCents: number | null;
  stock: number | null;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string; image: string }[];
  priceCents: number | null;
  stock: number | null;
  active: boolean;
  featured: boolean;
  source?: { catalog: string; page: number; url: string };
  sourceText?: string;
  specs: Record<string, string>;
  variantInventory: Record<string, VariantInventory>;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
};
export type CartLine = {
  productId: string;
  color: string;
  size: string;
  quantity: number;
};
export type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  active: boolean;
  image?: string;
};
export const variantKey = (color: string, size: string) =>
  JSON.stringify([color, size]);
export function variantPrice(p: Product, color: string, size: string) {
  return (
    p.variantInventory[variantKey(color, size)]?.priceCents ?? p.priceCents
  );
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const whatsapp = (message: string) =>
  "https://wa.me/5521990015722?text=" + encodeURIComponent(message);
