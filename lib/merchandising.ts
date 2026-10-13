import { db, products } from "./db";
import { variantKey, variantPrice, type Product } from "./types";
export type Highlights = {
  bestSellers: string[];
  priority: string[];
  periodDays: number;
};
const available = (p: Product) =>
  p.active &&
  p.colors.some((c) =>
    p.sizes.some((size) => {
      const stock =
        p.variantInventory[variantKey(c.name, size)]?.stock ?? p.stock;
      return stock !== null && stock > 0;
    }),
  );
export function merchandising() {
  const eligible = products().filter(available);
  const ids = new Set(eligible.map((p) => p.id));
  const sales = db()
    .prepare(
      `SELECT l.product_id AS productId, SUM(l.quantity) AS quantity
    FROM order_lines l JOIN orders o ON o.id=l.order_id
    JOIN cash c ON c.order_id=o.id AND c.direction='in'
    WHERE o.status IN ('paid','completed') AND c.created_at >= datetime('now','-90 days')
    GROUP BY l.product_id ORDER BY quantity DESC, l.product_id`,
    )
    .all()
    .map((row) => ({
      productId: String(row.productId),
      quantity: Number(row.quantity),
    }))
    .filter((row) => ids.has(row.productId));
  const costs = db()
    .prepare(
      "SELECT product_id AS productId, variant, cost_cents AS costCents FROM marketing_costs",
    )
    .all()
    .map((row) => ({
      productId: String(row.productId),
      variant: String(row.variant),
      costCents: Number(row.costCents),
    }));
  const margins = eligible
    .flatMap((p) => {
      const key = variantKey(p.colors[0].name, p.sizes[0]);
      const cost =
        costs.find((c) => c.productId === p.id && c.variant === key) ??
        costs.find((c) => c.productId === p.id && c.variant === "");
      const price = variantPrice(p, p.colors[0].name, p.sizes[0]);
      const stock = p.variantInventory[key]?.stock ?? p.stock;
      if (!cost || price === null || price <= cost.costCents || stock === 0)
        return [];
      return [
        {
          productId: p.id,
          category: p.category,
          priceCents: price,
          costCents: cost.costCents,
          marginCents: price - cost.costCents,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.marginCents - a.marginCents || a.productId.localeCompare(b.productId),
    );
  const priority: string[] = [];
  const categories = new Set<string>();
  for (const row of margins) {
    if (categories.has(row.category)) continue;
    priority.push(row.productId);
    categories.add(row.category);
    if (priority.length === 2) break;
  }
  if (priority.length < 2)
    for (const row of margins) {
      if (!priority.includes(row.productId)) priority.push(row.productId);
      if (priority.length === 2) break;
    }
  const highlights: Highlights = {
    bestSellers: sales.slice(0, 4).map((row) => row.productId),
    priority,
    periodDays: 90,
  };
  return { highlights, costs, sales, margins };
}
