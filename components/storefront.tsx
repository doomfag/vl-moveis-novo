"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  ShieldCheck,
  MessageCircle,
  SlidersHorizontal,
  Check,
  Armchair,
  BedDouble,
  Scale,
  Sparkles,
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
import { ProductCard } from "./product-card";
import { useStore } from "./store-context";
import { ProductPage } from "./product-page";
import { Account, Cart } from "./account-cart";
import Admin from "./admin";
import { AccountSecurity } from "./account-security";
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
      title: "Seu lar merece\nmais conforto.",
      subtitle:
        "Colchões, móveis e boas escolhas para transformar os seus dias. Com o cuidado de quem está pertinho de você.",
      cta: "Encontre seu conforto",
      href: "/catalogo",
      active: true,
    },
    {
      id: "sleep",
      title: "Dias melhores\ncomeçam à noite.",
      subtitle:
        "Conheça a linha Ortobom e encontre o colchão que combina com o seu descanso.",
      cta: "Explorar colchões",
      href: "/catalogo?categoria=Colch%C3%B5es",
      active: true,
    },
  ];
  const slides = promotions.length ? promotions : defaults;
  const [index, setIndex] = useState(0);
  const current = slides[index % slides.length];
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 9000);
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
          alt="Um quarto acolhedor com cama e colchão Ortobom"
          fetchPriority="high"
          width={1190}
          height={940}
        />
      </div>
      <div className="hero-shade" />
      <div className="hero-content" key={current.id}>
        <span className="hero-eyebrow">
          <span /> BEM-VINDO À SUA NOVA CASA
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
          <ShieldCheck size={15} /> Atendimento de perto. Escolhas com
          confiança.
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
        <div>
          <button
            aria-label="Destaque anterior"
            onClick={() =>
              setIndex((index - 1 + slides.length) % slides.length)
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Próximo destaque"
            onClick={() => setIndex((index + 1) % slides.length)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="hero-stamp">
        <BedDouble size={19} />
        <div>
          <b>Conforto Ortobom</b>
          <small>Para descansar de verdade.</small>
        </div>
      </div>
    </section>
  );
}
function Home({
  products,
  promotions,
}: {
  products: Product[];
  promotions: Promotion[];
}) {
  const featured = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => p.category === "Bases e camas"),
    ...products.filter((p) => p.category === "Travesseiros"),
  ];
  const picks = [
    featured[0],
    featured[3],
    products.find((p) => p.id === "base-sommier-bau-camurca"),
    products.find((p) => p.id === "travesseiro-percal-200-fios"),
  ].filter(Boolean) as Product[];
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
        <div className="home-breadcrumb">
          Um novo jeito de se sentir em casa.
        </div>
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
              <small>Conforto em cada detalhe</small>
            </span>
          </div>
          <div>
            <MessageCircle />
            <span>
              <b>Atendimento de verdade</b>
              <small>Conte com a nossa equipe</small>
            </span>
          </div>
          <div>
            <Truck />
            <span>
              <b>Entrega do seu jeito</b>
              <small>Consulte ou retire na loja</small>
            </span>
          </div>
        </div>
        <section className="section">
          <Heading
            eyebrow="CADA CANTINHO IMPORTA"
            title="O que deixa sua casa mais você?"
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
            eyebrow="ESCOLHAS QUE FAZEM A DIFERENÇA"
            title="Seu próximo conforto está aqui"
            description="Peças selecionadas para cuidar da sua casa — e do seu descanso."
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
              <span className="eyebrow accent">
                UM QUARTO, MAIS POSSIBILIDADES
              </span>
              <h2>
                Mais espaço.
                <br />
                Menos bagunça.
              </h2>
              <p>
                Conheça as bases baú que unem
                <br />
                conforto e praticidade.
              </p>
              <span className="text-link">
                Encontrar a sua <ArrowUpRight size={18} />
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
              <span className="eyebrow">
                PEQUENOS DETALHES. GRANDES DESCANSOS.
              </span>
              <h2>
                Deite. Relaxe.
                <br />
                Sinta a diferença.
              </h2>
              <p>
                Um travesseiro que combina
                <br />
                com seu jeito de dormir.
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
            eyebrow="NÃO PRECISA ESCOLHER SOZINHO"
            title="Vamos encontrar o seu conforto?"
            description="Compare detalhes e conte com a gente para fazer uma escolha tranquila."
          />
          <ComfortGuide products={products} />
        </section>
        <section className="visit-banner">
          <div className="visit-icon">
            <Armchair size={46} strokeWidth={1.2} />
          </div>
          <div>
            <span className="eyebrow accent">
              DO ONLINE PARA UM CAFÉ COM A GENTE
            </span>
            <h2>Toque, experimente, sinta-se em casa.</h2>
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
  const [choice, setChoice] = useState("");
  const options = [
    {
      id: "pocket",
      title: "Descanso a dois",
      text: "Molas ensacadas e conforto individual.",
      icon: <BedDouble />,
    },
    {
      id: "foam",
      title: "Sustentação e firmeza",
      text: "Descubra as opções de espuma.",
      icon: <ShieldCheck />,
    },
    {
      id: "space",
      title: "Um quarto mais prático",
      text: "Espaço extra com uma base baú.",
      icon: <Armchair />,
    },
  ];
  const selected = choice
    ? products
        .filter((p) =>
          choice === "pocket"
            ? p.category === "Colchões" && /ensacad/i.test(p.description)
            : choice === "foam"
              ? p.category === "Colchões" && /Fit (33|45)/i.test(p.name)
              : /Baú/i.test(p.name),
        )
        .slice(0, 3)
    : [];
  return (
    <>
      <div className="guide-options">
        {options.map((o) => (
          <button
            key={o.id}
            className={choice === o.id ? "chosen" : ""}
            onClick={() => setChoice(choice === o.id ? "" : o.id)}
            aria-pressed={choice === o.id}
          >
            {o.icon}
            <span>
              <b>{o.title}</b>
              <small>{o.text}</small>
            </span>
            {choice === o.id ? <Check size={19} /> : <ArrowUpRight size={19} />}
          </button>
        ))}
      </div>
      {choice && (
        <div className="guide-results">
          <p>
            <Sparkles size={16} /> Opções com características que combinam com o
            que você procura. Confira as medidas antes de escolher.
          </p>
          <div className="product-grid three">
            {selected.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </>
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
        eyebrow={favorites ? "SEU CANTINHO ESPECIAL" : "ENCONTRE SEU CONFORTO"}
        title={
          favorites
            ? "Escolhas que você guardou"
            : q
              ? "Resultados para “" + q + "”"
              : category || "Boas escolhas para a sua casa"
        }
        description={
          favorites
            ? "Seus favoritos ficam salvos neste dispositivo."
            : "Descubra detalhes, compare e escolha no seu tempo."
        }
      />
      <div className="catalog-layout">
        <aside className={"filters " + (mobileFilters ? "open" : "")}>
          <h3>
            <SlidersHorizontal size={17} /> Encontre do seu jeito
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
            <h4>Uma ajudinha?</h4>
            <p>Fale com quem entende de conforto.</p>
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
                  ? "Seus próximos favoritos vão morar aqui."
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
function Compare({ products }: { products: Product[] }) {
  const s = useStore();
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const items = s.compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  const prices = items.map((p) =>
    variantPrice(p, p.colors[0].name, p.sizes[0]),
  );
  const knownPrices = prices.filter((p): p is number => p !== null);
  const lowest = knownPrices.length >= 2 ? Math.min(...knownPrices) : null;
  const specs = [...new Set(items.flatMap((p) => Object.keys(p.specs)))].filter(
    (k) => !["Medidas", "Linha"].includes(k),
  );
  const rows: { label: string; values: string[] }[] = [
    {
      label: "Preço",
      values: prices.map((p) => (p === null ? "Sob consulta" : money(p))),
    },
    { label: "Marca", values: items.map((p) => p.brand) },
    { label: "Categoria", values: items.map((p) => p.category) },
    {
      label: "Medidas disponíveis",
      values: items.map((p) => p.sizes.join(" · ")),
    },
    {
      label: "Cores com foto",
      values: items.map((p) => p.colors.map((c) => c.name).join(", ")),
    },
    ...specs.map((label) => ({
      label,
      values: items.map((p) => {
        const value = p.specs[label];
        return !value ||
          /Veja as especificações|Consulte o catálogo/i.test(value)
          ? "Não informado"
          : value;
      }),
    })),
  ];
  const visibleRows = rows.filter(
    (row) =>
      row.label === "Preço" || !differencesOnly || new Set(row.values).size > 1,
  );
  return (
    <div className="container inner-page">
      <Heading
        eyebrow="COMPARAÇÃO"
        title={`${items.length} produtos lado a lado`}
      />
      {items.length ? (
        <>
          <label className="comparison-controls">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(e) => setDifferencesOnly(e.target.checked)}
            />{" "}
            Mostrar apenas diferenças
          </label>
          <div className="comparison-wrap">
            <table className="comparison">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Característica</span>
                  </th>
                  {items.map((p) => (
                    <th key={p.id}>
                      <button
                        className="remove-compare icon-button"
                        onClick={() => s.toggleCompare(p.id)}
                        aria-label={"Remover " + p.name}
                      >
                        <X size={18} />
                      </button>
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        width={180}
                        height={180}
                      />
                      <small>{p.brand}</small>
                      <br />
                      <Link href={"/produto/" + p.slug}>{p.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, i) => (
                      <td
                        key={items[i].id}
                        className={
                          row.label === "Preço" &&
                          lowest !== null &&
                          prices[i] === lowest
                            ? "best-value"
                            : ""
                        }
                      >
                        {value}
                        {row.label === "Preço" &&
                          lowest !== null &&
                          prices[i] === lowest && <small>MENOR PREÇO</small>}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th>
                    <span className="sr-only">Detalhes</span>
                  </th>
                  {items.map((p) => (
                    <td key={p.id}>
                      <Link
                        className="button button-dark"
                        href={"/produto/" + p.slug}
                      >
                        Ver produto <ArrowRight size={16} />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="comparison-tip">
            {differencesOnly ? "Características iguais foram ocultadas. " : ""}
            Preços correspondem à primeira cor e medida cadastradas; confirme a
            mesma medida para comparar valores. Características não informadas
            não são estimadas.
          </p>
        </>
      ) : (
        <div className="empty-state">
          <Scale size={40} />
          <h2>Selecione os produtos que deseja comparar</h2>
          <p>Marque “Comparar” nos produtos para ver até três lado a lado.</p>
          <Link href="/catalogo" className="button">
            Ver produtos <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
function Information({ view }: { view: string }) {
  if (view === "lojas")
    return (
      <div className="container inner-page">
        <Heading
          eyebrow="ESTAMOS POR PERTO"
          title="Pode entrar. A casa é sua."
          description="Duas lojas no Rio de Janeiro para você conhecer seu próximo conforto de perto."
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
                Combinar minha visita <ArrowUpRight size={17} />
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
}: {
  view: string;
  products: Product[];
  selected?: Product;
  promotions: Promotion[];
}) {
  return (
    <main id="conteudo">
      {view === "home" ? (
        <Home products={products} promotions={promotions} />
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
      ) : view === "admin" ? (
        <Admin />
      ) : (
        <Information view={view} />
      )}
    </main>
  );
}
