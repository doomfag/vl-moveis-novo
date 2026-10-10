"use client";
import Link from "next/link";
import { Heart, Scale, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useStore } from "./store-context";
import { type Product, money, whatsapp, variantPrice } from "@/lib/types";
export function ProductCard({ product: p }: { product: Product }) {
  const s = useStore(),
    price = variantPrice(p, p.colors[0].name, p.sizes[0]);
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={"/produto/" + p.slug} tabIndex={-1} aria-hidden="true">
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            width={500}
            height={400}
          />
        </Link>
        <span className="product-tag">
          {p.category === "Hotelaria"
            ? "Linha hotelaria"
            : p.category === "Bases e camas"
              ? "Mais espaço em casa"
              : "Ortobom"}
        </span>
        <button
          className={
            "favorite-button " + (s.favorites.includes(p.id) ? "selected" : "")
          }
          aria-label={
            s.favorites.includes(p.id)
              ? "Remover dos favoritos"
              : "Adicionar aos favoritos"
          }
          aria-pressed={s.favorites.includes(p.id)}
          onClick={() => s.toggleFavorite(p.id)}
        >
          <Heart size={18} />
        </button>
      </div>
      <div className="product-content">
        <small className="eyebrow">{p.category}</small>
        <Link href={"/produto/" + p.slug} className="product-name">
          {p.name}
        </Link>
        <p className="product-size">
          {p.sizes.length > 1
            ? p.sizes.length + " medidas disponíveis"
            : p.sizes[0]}
          {p.colors.length > 1 ? " · " + p.colors.length + " cores" : ""}
        </p>
        <div className="product-price">
          <strong>
            {price === null ? "Preço sob consulta" : money(price)}
          </strong>
          <span>
            {price === null
              ? "Vamos encontrar a melhor opção para você."
              : "Consulte as condições de pagamento."}
          </span>
        </div>
        {price === null ? (
          <a
            className="button button-outline product-cta"
            href={whatsapp(
              "Olá! Gostaria de saber o preço e a disponibilidade de " +
                p.name +
                ".",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Consultar preço <ArrowUpRight size={16} />
          </a>
        ) : (
          <button
            className="button product-cta"
            disabled={!s.ready}
            onClick={() => s.add(p, p.colors[0].name, p.sizes[0])}
          >
            Adicionar à sacola <ShoppingBag size={16} />
          </button>
        )}
        <button
          className={
            "compare-button " + (s.compare.includes(p.id) ? "selected" : "")
          }
          onClick={() => s.toggleCompare(p.id)}
          aria-pressed={s.compare.includes(p.id)}
        >
          <Scale size={14} />{" "}
          {s.compare.includes(p.id)
            ? "Selecionado para comparar"
            : "Comparar produto"}
        </button>
      </div>
    </article>
  );
}
