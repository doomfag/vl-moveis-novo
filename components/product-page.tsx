"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  ZoomIn,
  X,
  ShoppingBag,
  Heart,
  Scale,
  Truck,
  ShieldCheck,
  ArrowUpRight,
  Star,
  Check,
  BookOpen,
  MapPin,
} from "lucide-react";
import {
  type Product,
  money,
  variantPrice,
  variantKey,
  whatsapp,
} from "@/lib/types";
import { useStore, api } from "./store-context";
import { ProductCard } from "./product-card";
type Review = {
  id: string;
  name: string;
  stars: number;
  text: string;
  created_at: string;
  verified: number;
};
export function ProductPage({
  product: p,
  products,
}: {
  product: Product;
  products: Product[];
}) {
  const zoom = useRef<HTMLDialogElement>(null);
  const s = useStore(),
    [color, setColor] = useState(p.colors[0]),
    [size, setSize] = useState(p.sizes[0]),
    [image, setImage] = useState(p.images[0]),
    [cep, setCep] = useState(""),
    [shipping, setShipping] = useState(""),
    [shippingBusy, setShippingBusy] = useState(false),
    [reviews, setReviews] = useState<Review[]>([]),
    [reviewError, setReviewError] = useState(""),
    [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false);
  const price = variantPrice(p, color.name, size),
    stock = p.variantInventory[variantKey(color.name, size)]?.stock ?? p.stock;
  useEffect(() => {
    api("reviews?productId=" + encodeURIComponent(p.id))
      .then((d) => setReviews(d.reviews))
      .catch((e: Error) => setReviewError(e.message));
  }, [p.id]);
  const calculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setShippingBusy(true);
    try {
      const r = await api("shipping", "POST", { cep: cep.replace(/\D/g, "") });
      setShipping(r.message);
    } catch (e) {
      setShipping((e as Error).message);
    } finally {
      setShippingBusy(false);
    }
  };
  const review = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("reviews", "POST", { productId: p.id, stars: rating, text });
      setText("");
      setReviews(
        (await api("reviews?productId=" + encodeURIComponent(p.id))).reviews,
      );
      setReviewError("");
      s.notify("Sua avaliação foi publicada. Obrigado!");
    } catch (e) {
      setReviewError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const related = products
    .filter(
      (x) =>
        x.id !== p.id &&
        (p.category === "Colchões"
          ? ["Travesseiros", "Bases e camas"].includes(x.category)
          : x.category === p.category),
    )
    .slice(0, 4);
  return (
    <div className="container inner-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <ChevronRight size={12} />
        <Link href={"/catalogo?categoria=" + encodeURIComponent(p.category)}>
          {p.category}
        </Link>
        <ChevronRight size={12} />
        <span>{p.name}</span>
      </div>
      <div className="pdp">
        <div className="product-gallery">
          <dialog
            ref={zoom}
            className="photo-zoom"
            aria-label="Foto ampliada do produto"
          >
            <button
              className="button button-dark"
              onClick={() => zoom.current?.close()}
            >
              Fechar foto <X size={18} />
            </button>
            <img src={image} alt={p.name + " — foto ampliada"} />
            <p>{p.name}</p>
          </dialog>
          <div className="gallery-main">
            <img
              src={image}
              alt={p.name + " — " + color.name}
              width={800}
              height={650}
            />
            <button
              className="gallery-zoom button button-dark"
              onClick={() => zoom.current?.showModal()}
              aria-label="Ampliar foto do produto"
            >
              <ZoomIn size={18} /> Ampliar
            </button>
            <button
              className={
                "favorite-button " +
                (s.favorites.includes(p.id) ? "selected" : "")
              }
              aria-label="Salvar nos favoritos"
              aria-pressed={s.favorites.includes(p.id)}
              onClick={() => s.toggleFavorite(p.id)}
            >
              <Heart size={21} />
            </button>
          </div>
          <div className="gallery-thumbs">
            {p.images.map((img, i) => (
              <button
                key={img}
                className={image === img ? "active" : ""}
                onClick={() => {
                  setImage(img);
                  const c = p.colors.find((c) => c.image === img);
                  if (c) setColor(c);
                }}
                aria-label={"Ver foto " + (i + 1)}
              >
                <img src={img} alt="" width={100} height={80} />
              </button>
            ))}
          </div>
          <p className="photo-note">
            {p.photoNote ||
              "Fotos reais fornecidas pelo fabricante. Confira cor e medidas na descrição."}
          </p>
        </div>
        <div className="product-details">
          <span className="eyebrow accent">
            ORTOBOM · {p.category.toUpperCase()}
          </span>
          <h1>{p.name}</h1>
          <a href="#avaliacoes" className="review-summary">
            <Star size={15} />
            {reviews.length
              ? (
                  reviews.reduce((n, r) => n + r.stars, 0) / reviews.length
                ).toFixed(1) +
                " · " +
                reviews.length +
                " avaliações"
              : "Ainda sem avaliações. Seja o primeiro."}
          </a>
          <div className="pdp-price">
            {!!p.discountPercent && price !== null && (
              <p>{p.discountPercent}% de desconto aplicado</p>
            )}
            <strong>
              {price === null ? "Preço sob consulta" : money(price)}
            </strong>
            <p>
              {price === null
                ? "Consulte preço e disponibilidade com a loja."
                : "Consulte as formas e condições de pagamento com a loja."}
            </p>
          </div>
          <div className="variant-section">
            <h3>
              Cor: <span>{color.name}</span>
            </h3>
            <div className="color-options">
              {p.colors.map((c) => (
                <button
                  key={c.name}
                  className={color.name === c.name ? "selected" : ""}
                  style={{ "--swatch": c.hex } as React.CSSProperties}
                  onClick={() => {
                    setColor(c);
                    setImage(c.image);
                  }}
                  aria-label={"Selecionar cor " + c.name}
                  aria-pressed={color.name === c.name}
                  title={c.name}
                >
                  {color.name === c.name && <Check size={15} />}
                </button>
              ))}
            </div>
            {p.colors.length === 1 && (
              <small className="muted">
                Para outras cores, consulte a loja.
              </small>
            )}
            <h3>
              Medida <span>(conforme catálogo)</span>
            </h3>
            <select
              className="size-select"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              aria-label="Medida do produto"
            >
              {p.sizes.map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </div>
          {stock === 0 ? (
            <p className="stock-note">
              Indisponível no momento. Fale com a loja sobre reposição.
            </p>
          ) : null}
          <div className="pdp-ctas">
            {price === null ? (
              <a
                className="button"
                href={whatsapp(
                  `Olá! Gostaria de consultar preço e disponibilidade de ${p.name}, cor ${color.name}, medida ${size}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Consultar no WhatsApp <ArrowUpRight size={19} />
              </a>
            ) : (
              <button
                className="button"
                onClick={() => s.add(p, color.name, size)}
                disabled={stock === 0 || !s.ready}
              >
                <ShoppingBag size={19} /> Adicionar à sacola
              </button>
            )}
            {price === null && (
              <button
                className="button button-outline"
                onClick={() => s.add(p, color.name, size)}
                disabled={!s.ready}
              >
                <ShoppingBag size={18} /> Salvar na sacola para orçamento
              </button>
            )}
            <button
              className="compare-button"
              onClick={() => s.toggleCompare(p.id)}
            >
              <Scale size={16} />
              {s.compare.includes(p.id)
                ? "Remover da comparação"
                : "Comparar com outro produto"}
            </button>
          </div>
          <div className="shipping-box">
            <h3>
              <Truck size={18} /> Entrega e retirada
            </h3>
            <form onSubmit={calculate}>
              <input
                aria-label="CEP para entrega"
                inputMode="numeric"
                placeholder="Digite seu CEP"
                value={cep}
                onChange={(e) =>
                  setCep(e.target.value.replace(/[^\d-]/g, "").slice(0, 9))
                }
                pattern="[0-9]{5}-?[0-9]{3}"
                required
              />
              <button className="button button-dark" disabled={shippingBusy}>
                {shippingBusy ? "Consultando…" : "Consultar"}
              </button>
            </form>
            {shipping && (
              <div className="shipping-result">
                <p>{shipping}</p>
                <a
                  className="text-link"
                  href={whatsapp(
                    `Olá! Gostaria de cotar a entrega de ${p.name} para o CEP ${cep}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pedir orçamento de entrega <ArrowUpRight size={15} />
                </a>
              </div>
            )}
            <p>
              <MapPin size={14} /> Retirada disponível nas lojas, após
              confirmação.
            </p>
          </div>
          <div className="pdp-assurance">
            <ShieldCheck size={18} /> Consulte modelo, medida e disponibilidade
            antes do pedido.
          </div>
        </div>
      </div>
      <section className="section product-description">
        <div>
          <span className="eyebrow accent">DESCRIÇÃO</span>
          <h2>Descrição do produto</h2>
          {p.description.split("\n\n").map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
        <div className="spec-card">
          <h3>Um olhar nos detalhes</h3>
          <dl>
            <dt>Marca</dt>
            <dd>{p.brand}</dd>
            <dt>Categoria</dt>
            <dd>{p.category}</dd>
            <dt>Cores com fotografia</dt>
            <dd>{p.colors.map((c) => c.name).join(", ")}</dd>
            <dt>Medidas cadastradas</dt>
            <dd>{p.sizes.join(" · ")}</dd>
            {Object.entries(p.specs)
              .filter(([k]) => k !== "Medidas")
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </section>
      <section id="avaliacoes" className="section review-section">
        <div>
          <span className="eyebrow accent">EXPERIÊNCIAS REAIS</span>
          <h2>Quem escolheu, conta.</h2>
          {reviews.length ? (
            reviews.map((r) => (
              <article key={r.id} className="review-card">
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={15}
                      fill={i <= r.stars ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <h4>
                  {r.name.split(" ")[0]}{" "}
                  {r.verified ? (
                    <span className="verified">
                      <Check size={12} /> Compra confirmada
                    </span>
                  ) : null}
                </h4>
                <p>{r.text}</p>
              </article>
            ))
          ) : (
            <p className="muted">
              Ainda não recebemos avaliações deste produto. Aqui, toda opinião
              vem de uma pessoa real com conta na loja.
            </p>
          )}
        </div>
        <div className="review-form">
          <h3>Como foi sua experiência?</h3>
          {s.user ? (
            <form onSubmit={review}>
              <div
                className="rating-input"
                role="group"
                aria-label="Nota do produto"
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setRating(i)}
                    aria-label={i + " estrelas"}
                    aria-pressed={rating === i}
                  >
                    <Star fill={i <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <label>
                Sua avaliação
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  minLength={5}
                  maxLength={1500}
                  placeholder="Conte os detalhes que fizeram a diferença…"
                  required
                />
              </label>
              {reviewError && <p className="form-error">{reviewError}</p>}
              <button className="button button-dark" disabled={busy}>
                {busy ? "Publicando…" : "Publicar avaliação"}
              </button>
            </form>
          ) : (
            <>
              <p>
                Entre na sua conta para compartilhar sua opinião. Não publicamos
                avaliações inventadas.
              </p>
              <Link className="button button-outline" href="/conta">
                Entrar para avaliar <ArrowRightIcon />
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow accent">OS DETALHES TAMBÉM IMPORTAM</span>
            <h2>Produtos relacionados</h2>
          </div>
          <Link href="/catalogo" className="text-link">
            Ver todos <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={17} />;
}
