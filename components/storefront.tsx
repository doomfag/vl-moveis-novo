"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  Truck,
  ShieldCheck,
  MessageCircle,
  SlidersHorizontal,
  Armchair,
  BedDouble,
  Scale,
  Heart,
  Search,
  X,
  BookOpen,
} from "lucide-react";
import {
  type Product,
  type Promotion,
  money,
  whatsapp,
  variantPrice,
} from "@/lib/types";
import type { Highlights } from "@/lib/merchandising";
import { ProductCard } from "./product-card";
import { useStore } from "./store-context";
import { ProductPage } from "./product-page";
import { Account, Cart } from "./account-cart";
import Admin from "./admin";
import { AccountSecurity } from "./account-security";
import { Help, Credit } from "./help";
import { Compare } from "./comparison";
const cats = [
  "Colchões",
  "Bases e camas",
  "Cabeceiras",
  "Travesseiros",
  "Móveis",
  "Eletros",
  "Hotelaria",
  "Acessórios",
];
function Heading({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow accent">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          Ver todos <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
function Hero({ promotions }: { promotions: Promotion[] }) {
  const defaults: Promotion[] = [
    {
      id: "home",
      title: "Móveis, colchões\ne eletros",
      subtitle: "Consulte os produtos, medidas e disponibilidade da VL Móveis.",
      cta: "Ver produtos",
      href: "/catalogo",
      active: true,
      image: "/catalogo/hotelaria-1-ambiente.webp",
    },
    {
      id: "sleep",
      title: "Colchões Ortobom",
      subtitle: "Veja os modelos e compare suas especificações.",
      cta: "Explorar colchões",
      href: "/catalogo?categoria=Colch%C3%B5es",
      image: "/catalogo/comercial-3-produto-hd.webp",
      active: true,
    },
  ];
  const slides = promotions.length ? promotions : defaults;
  const [index, setIndex] = useState(0);
  const current = slides[index % slides.length];
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);
  return (
    <section
      className="hero"
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
    >
      <div className="hero-image">
        <img
          src={current.image || "/catalogo/hotelaria-1-ambiente.webp"}
          alt={
            current.id === "home"
              ? "Quarto com cama e colchão Ortobom"
              : current.title.replaceAll("\n", " ")
          }
          fetchPriority="high"
          width={1190}
          height={940}
        />
      </div>
      <div className="hero-shade" />
      <div className="hero-content" key={current.id}>
        <span className="hero-eyebrow">
          <span /> VL MÓVEIS
        </span>
        <h1>
          {current.title.split("\n").map((t, i) => (
            <span key={i}>
              {t}
              <br />
            </span>
          ))}
        </h1>
        <p>{current.subtitle}</p>
        <Link className="button button-dark" href={current.href}>
          {current.cta} <ArrowUpRight size={18} />
        </Link>
        <div className="hero-note">
          <ShieldCheck size={15} /> Atendimento em Sepetiba, Campo Grande e pelo
          WhatsApp.
        </div>
      </div>
      <div className="hero-controls">
        <div className="hero-dots">
          {slides.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={"Ver destaque " + (i + 1)}
              aria-current={index % slides.length === i ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
function Home({
  products,
  promotions,
  highlights,
}: {
  products: Product[];
  promotions: Promotion[];
  highlights?: Highlights;
}) {
  const featured = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => p.category === "Bases e camas"),
    ...products.filter((p) => p.category === "Travesseiros"),
  ];
  const picks = [
    ...(highlights?.priority || []).map((id) =>
      products.find((p) => p.id === id),
    ),
    featured[0],
    featured[3],
    products.find((p) => p.id === "base-sommier-bau-camurca"),
    products.find((p) => p.id === "travesseiro-percal-200-fios"),
  ]
    .filter(
      (p, index, all) =>
        p && all.findIndex((other) => other?.id === p.id) === index,
    )
    .slice(0, 4) as Product[];
  const bestSellers = (highlights?.bestSellers || [])
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];
  const categoryPicks = [
    "Colchões",
    "Bases e camas",
    "Cabeceiras",
    "Travesseiros",
    "Hotelaria",
    "Acessórios",
  ];
  return (
    <>
      <div className="container">
        <div className="home-breadcrumb">VL Móveis</div>
        <Hero promotions={promotions} />
        <div className="benefits">
          <div>
            <MapPin />
            <span>
              <b>Duas lojas no Rio</b>
              <small>Sepetiba e Campo Grande</small>
            </span>
          </div>
          <div>
            <BedDouble />
            <span>
              <b>Qualidade Ortobom</b>
              <small>Colchões, bases e travesseiros</small>
            </span>
          </div>
          <div>
            <MessageCircle />
            <span>
              <b>Atendimento</b>
              <small>Loja e WhatsApp</small>
            </span>
          </div>
          <div>
            <Truck />
            <span>
              <b>Entrega e retirada</b>
              <small>Consulte ou retire na loja</small>
            </span>
          </div>
        </div>
        {bestSellers.length > 0 && (
          <section className="section" aria-label="Mais comprados">
            <Heading
              eyebrow="ESCOLHAS DOS CLIENTES"
              title="Mais comprados"
              description="Produtos mais comprados nos últimos 90 dias, considerando pagamentos confirmados."
            />
            <div className="product-grid">
              {bestSellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
        <section className="section">
          <Heading
            eyebrow="CATEGORIAS"
            title="Categorias de produtos"
            href="/catalogo"
          />
          <div className="category-row">
            {categoryPicks.map((c) => {
              const p = products.find((p) => p.category === c);
              return (
                <Link
                  href={"/catalogo?categoria=" + encodeURIComponent(c)}
                  key={c}
                  className="category-tile"
                >
                  <div>
                    <img
                      src={p?.images[0]}
                      alt=""
                      loading="lazy"
                      width={200}
                      height={150}
                    />
                    <span>
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                  <h3>{c}</h3>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="section">
          <Heading
            eyebrow="PRODUTOS"
            title="Produtos em destaque"
            description="Consulte os detalhes de cada produto."
            href="/catalogo"
          />
          <div className="product-grid">
            {picks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
        <section className="editorial-grid">
          <Link
            className="editorial-card cream"
            href="/catalogo?categoria=Bases%20e%20camas"
          >
            <div>
              <span className="eyebrow accent">BASES E CAMAS</span>
              <h2>Bases baú</h2>
              <p>
                Bases com compartimento
                <br />
                para armazenamento.
              </p>
              <span className="text-link">
                Ver bases <ArrowUpRight size={18} />
              </span>
            </div>
            <img
              src={
                products.find((p) => p.id === "base-sommier-bau-camurca")
                  ?.images[0]
              }
              alt="Base baú com compartimento aberto"
              loading="lazy"
              width={500}
              height={400}
            />
          </Link>
          <Link
            className="editorial-card orange"
            href="/catalogo?categoria=Travesseiros"
          >
            <div>
              <span className="eyebrow">TRAVESSEIROS</span>
              <h2>Travesseiros</h2>
              <p>
                Compare materiais
                <br />e medidas disponíveis.
              </p>
              <span className="text-link">
                Explorar travesseiros <ArrowUpRight size={18} />
              </span>
            </div>
            <img
              src={
                products.find((p) => p.id === "travesseiro-percal-200-fios")
                  ?.images[0]
              }
              alt="Travesseiro Ortobom Percal 200 fios"
              loading="lazy"
              width={500}
              height={400}
            />
          </Link>
        </section>
        <section className="section">
          <Heading
            eyebrow="ESPECIFICAÇÕES"
            title="Ajuda para escolher"
            description="Selecione um produto para consultar suas características."
          />
          <ComfortGuide products={products} />
        </section>
        <Credit />
        <section className="section">
          <Heading
            title="Ajuda e perguntas frequentes"
            description="Entrega, pagamento, garantia e cadastro."
          />
          <Link href="/ajuda" className="button button-dark">
            Consultar ajuda <ArrowRight size={17} />
          </Link>
        </section>
        <section className="visit-banner">
          <div className="visit-icon">
            <Armchair size={46} strokeWidth={1.2} />
          </div>
          <div>
            <span className="eyebrow accent">LOJAS</span>
            <h2>Visite nossas lojas</h2>
            <p>
              Visite a VL Móveis em Sepetiba ou Campo Grande, no Rio de Janeiro.
            </p>
          </div>
          <Link href="/lojas" className="button button-dark">
            Conhecer nossas lojas <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}
function ComfortGuide({ products }: { products: Product[] }) {
  const categories = cats.filter((c) => products.some((p) => p.category === c));
  const [category, setCategory] = useState(categories[0] || "");
  const [productId, setProductId] = useState("");
  const list = products.filter((p) => p.category === category);
  const selected = list.find((p) => p.id === productId) || list[0];
  if (!selected) return null;
  const specs = Object.entries(selected.specs).filter(
    ([label, value]) =>
      label !== "Medidas" &&
      !/Veja as especificações|Consulte o catálogo/i.test(value),
  );
  return (
    <div className="product-guide">
      <img
        src={selected.images[0]}
        alt={selected.name}
        width={600}
        height={600}
        loading="lazy"
      />
      <div>
        <div className="help-categories">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={category === c ? "active" : ""}
              onClick={() => {
                setCategory(c);
                setProductId("");
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="guide-select">
          Produto
          <select
            aria-label="Produto para consultar características"
            value={selected.id}
            onChange={(e) => setProductId(e.target.value)}
          >
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <h3>{selected.name}</h3>
        <dl className="guide-specs">
          <div>
            <dt>Medidas disponíveis</dt>
            <dd>{selected.sizes.join(" · ")}</dd>
          </div>
          {specs.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {selected.photoNote && <p className="muted">{selected.photoNote}</p>}
        <Link className="button button-dark" href={"/produto/" + selected.slug}>
          Ver produto <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
function Catalog({
  products,
  favorites = false,
}: {
  products: Product[];
  favorites?: boolean;
}) {
  const params = useSearchParams(),
    s = useStore(),
    [category, setCategory] = useState(params.get("categoria") || ""),
    [sort, setSort] = useState("relevance"),
    [mobileFilters, setMobileFilters] = useState(false),
    [onlyPriced, setOnlyPriced] = useState(false);
  const q = params.get("q") || "";
  useEffect(() => setCategory(params.get("categoria") || ""), [params]);
  const normalize = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const list = products
    .filter(
      (p) =>
        (!favorites || s.favorites.includes(p.id)) &&
        (!category || p.category === category) &&
        (!q ||
          normalize(p.name + " " + p.description + " " + p.category).includes(
            normalize(q),
          )) &&
        (!onlyPriced || p.priceCents !== null),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "pt-BR")
        : sort === "price-up"
          ? (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
          : sort === "price-down"
            ? (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <div className="container inner-page">
      <div className="breadcrumbs">
        <Link href="/">Início</Link>
        <ChevronRight size={12} />
        <span>{favorites ? "Favoritos" : "Produtos"}</span>
      </div>
      <Heading
        eyebrow={favorites ? "FAVORITOS" : "PRODUTOS"}
        title={
          favorites
            ? "Escolhas que você guardou"
            : q
              ? "Resultados para “" + q + "”"
              : category || "Todos os produtos"
        }
        description={
          favorites
            ? "Seus favoritos ficam salvos neste dispositivo."
            : "Consulte modelos, medidas e disponibilidade."
        }
      />
      <div className="catalog-layout">
        <aside className={"filters " + (mobileFilters ? "open" : "")}>
          <h3>
            <SlidersHorizontal size={17} /> Filtros
            <button
              className="mobile icon-button"
              onClick={() => setMobileFilters(false)}
              aria-label="Fechar filtros"
            >
              <X size={17} />
            </button>
          </h3>
          <h4>Categorias</h4>
          <button
            className={!category ? "active" : ""}
            onClick={() => setCategory("")}
          >
            Todos os produtos <span>{products.length}</span>
          </button>
          {cats.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
              <span>{products.filter((p) => p.category === c).length}</span>
            </button>
          ))}
          <h4>Preço</h4>
          <label className="check-label">
            <input
              type="checkbox"
              checked={onlyPriced}
              onChange={(e) => setOnlyPriced(e.target.checked)}
            />{" "}
            Com preço cadastrado
          </label>
          <p className="muted">
            Para os demais produtos, nossa equipe informa preço e
            disponibilidade.
          </p>
          <div className="filter-help">
            <MessageCircle size={24} />
            <h4>Precisa de ajuda?</h4>
            <p>Consulte nossa equipe.</p>
            <a
              href={whatsapp("Olá! Preciso de ajuda para escolher um produto.")}
              className="text-link"
              target="_blank"
              rel="noreferrer"
            >
              Chamar no WhatsApp <ArrowUpRight size={15} />
            </a>
          </div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <span>
              {list.length}{" "}
              {list.length === 1
                ? "produto encontrado"
                : "produtos encontrados"}
            </span>
            <button
              className="button button-outline mobile"
              onClick={() => setMobileFilters(!mobileFilters)}
            >
              <SlidersHorizontal size={16} /> Filtros
            </button>
            <label>
              Ordenar por{" "}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Ordenar produtos"
              >
                <option value="relevance">Destaques</option>
                <option value="name">Nome A–Z</option>
                <option value="price-up">Menor preço</option>
                <option value="price-down">Maior preço</option>
              </select>
            </label>
          </div>
          {list.length ? (
            <div className="product-grid three">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={38} />
              <h2>
                {favorites
                  ? "Nenhum produto nos favoritos."
                  : "Vamos encontrar o que você precisa."}
              </h2>
              <p>
                {category === "Móveis" || category === "Eletros"
                  ? "Estamos preparando esta coleção. Consulte a loja para saber quais móveis e eletros estão disponíveis."
                  : "Experimente outra busca ou conte com a ajuda da nossa equipe."}
              </p>
              <a
                className="button"
                href={whatsapp(
                  "Olá! Procuro " +
                    (category || q || "um produto") +
                    ". Podem me ajudar?",
                )}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a loja <ArrowUpRight size={16} />
              </a>
              <button
                className="text-link"
                onClick={() => {
                  setCategory("");
                  setOnlyPriced(false);
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Information({ view }: { view: string }) {
  if (view === "lojas")
    return (
      <div className="container inner-page">
        <Heading
          eyebrow="ESTAMOS POR PERTO"
          title="Nossas lojas"
          description="Atendimento em Sepetiba e Campo Grande, no Rio de Janeiro."
        />
        <div className="store-locations">
          {["Sepetiba", "Campo Grande"].map((name) => (
            <article key={name}>
              <MapPin size={32} />
              <span className="eyebrow accent">RIO DE JANEIRO</span>
              <h2>VL Móveis {name}</h2>
              <p>
                Converse com a equipe para confirmar endereço de atendimento,
                horário e disponibilidade antes da visita.
              </p>
              <a
                className="button button-dark"
                href={whatsapp(
                  "Olá! Quero visitar a loja de " +
                    name +
                    ". Qual é o endereço e o horário de funcionamento?",
                )}
                target="_blank"
                rel="noreferrer"
              >
                Consultar endereço e horário <ArrowUpRight size={17} />
              </a>
            </article>
          ))}
        </div>
        <div className="legal-card">
          <h3>Sede administrativa</h3>
          <p>
            Estrada do Piaí, nº 6269 · Rio de Janeiro – RJ
            <br />
            CEP 23545-353 · CNPJ 39.930.081/0001-64
          </p>
          <p className="muted">
            O endereço da sede administrativa não substitui a confirmação do
            endereço de cada loja.
          </p>
        </div>
      </div>
    );
  return (
    <div className="container inner-page prose">
      <Heading
        eyebrow="CLAREZA EM CADA ESCOLHA"
        title={
          view === "privacidade"
            ? "Cuidado com seus dados"
            : "Compras, pagamentos e entregas"
        }
      />
      {view === "privacidade" ? (
        <>
          <h2>O que guardamos</h2>
          <p>
            Para manter sua conta e atender você, guardamos nome, e-mail, senha
            protegida por hash, sacola, pedidos, avaliações e mensagens. O
            atendimento tem acesso aos dados necessários para acompanhar sua
            solicitação.
          </p>
          <h2>Cookies e preferências</h2>
          <p>
            Usamos um cookie essencial para manter sua sessão. Favoritos,
            comparação e a sacola de visitantes ficam neste dispositivo. Não
            usamos cookies de publicidade nesta versão.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Para solicitar acesso, correção ou exclusão dos seus dados, fale com
            a VL Móveis pelo WhatsApp. Dados de pedidos podem precisar ser
            mantidos para obrigações legais.
          </p>
          <h2>Serviços externos</h2>
          <p>
            Ao abrir WhatsApp ou Instagram, você passa a usar esses serviços e
            suas políticas. As conversas do atendimento neste site ficam com a
            loja.
          </p>
        </>
      ) : (
        <>
          <h2>Preço e disponibilidade</h2>
          <p>
            Produtos com “Preço sob consulta” dependem de orçamento. Medidas,
            cores e disponibilidade precisam ser confirmadas antes de fechar a
            compra. Fotos são as fornecidas pelo catálogo ou cadastradas pela
            loja.
          </p>
          <h2>Pedido e pagamento</h2>
          <p>
            Um pedido enviado pelo site fica aguardando confirmação e orientação
            de pagamento da loja. Não há cobrança automática nesta versão.
            Confira os dados e as condições com a equipe antes de pagar.
          </p>
          <h2>Entrega ou retirada</h2>
          <p>
            É possível solicitar retirada em Sepetiba ou Campo Grande. O prazo
            depende da confirmação da loja. Para entrega, informe seu CEP pelo
            WhatsApp: o valor, a montagem quando aplicável e o prazo precisam
            ser combinados antes do pagamento.
          </p>
          <h2>Trocas, devoluções e cancelamento</h2>
          <p>
            Fale com a loja para solicitar atendimento. Compras feitas fora do
            estabelecimento estão sujeitas ao direito de arrependimento de 7
            dias a partir do recebimento, conforme o Código de Defesa do
            Consumidor. Os demais direitos legais permanecem assegurados.
          </p>
        </>
      )}
      <a
        className="button"
        href={whatsapp(
          "Olá! Preciso falar sobre " +
            (view === "privacidade" ? "meus dados pessoais" : "uma compra") +
            ".",
        )}
        target="_blank"
        rel="noreferrer"
      >
        Falar com a VL Móveis <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
export default function Storefront({
  view,
  products,
  selected,
  promotions,
  highlights,
}: {
  highlights?: Highlights;
  view: string;
  products: Product[];
  selected?: Product;
  promotions: Promotion[];
}) {
  return (
    <main id="conteudo">
      {view === "home" ? (
        <Home
          products={products}
          promotions={promotions}
          highlights={highlights}
        />
      ) : view === "catalogo" || view === "favoritos" ? (
        <Suspense
          fallback={
            <div className="container empty-state">Carregando sua seleção…</div>
          }
        >
          <Catalog products={products} favorites={view === "favoritos"} />
        </Suspense>
      ) : view === "produto" && selected ? (
        <ProductPage product={selected} products={products} />
      ) : [
          "confirmar-email",
          "reenviar-confirmacao",
          "recuperar-senha",
          "redefinir-senha",
        ].includes(view) ? (
        <Suspense
          fallback={<div className="container empty-state">Carregando…</div>}
        >
          <AccountSecurity view={view} />
        </Suspense>
      ) : view === "conta" ? (
        <Account />
      ) : view === "sacola" ? (
        <Cart products={products} />
      ) : view === "comparar" ? (
        <Compare products={products} />
      ) : view === "ajuda" ? (
        <Help />
      ) : view === "admin" ? (
        <Admin />
      ) : (
        <Information view={view} />
      )}
    </main>
  );
}
