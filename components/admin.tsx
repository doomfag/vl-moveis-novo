"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MapPin,
  MessageCircle,
  Megaphone,
  Wallet,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Trash2,
  Pencil,
  Save,
  X,
  Send,
  ImagePlus,
  RefreshCw,
  Check,
  ChevronRight,
} from "lucide-react";
import { useStore, api } from "./store-context";
import { useDialog } from "./use-dialog";
import { type Product, type Promotion, money, variantKey } from "@/lib/types";
type Dashboard = {
  products: Product[];
  orders: any[];
  cash: any[];
  conversations: any[];
  promotions: Promotion[];
  counts: { customers: number };
  integrations: Record<string, string>;
};
const categories = [
  "Colchões",
  "Travesseiros",
  "Bases e camas",
  "Cabeceiras",
  "Hotelaria",
  "Acessórios",
  "Móveis",
  "Eletros",
];
const tabs = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "products", label: "Produtos e estoque", icon: Package },
  { id: "orders", label: "Pedidos e clientes", icon: ShoppingBag },
  { id: "chat", label: "Atendimento", icon: MessageCircle },
  { id: "promotions", label: "Banners e campanhas", icon: Megaphone },
  { id: "cash", label: "Fluxo de caixa", icon: Wallet },
  { id: "integrations", label: "Integrações", icon: Settings },
];
function emptyProduct(): Product {
  const id = "produto-" + crypto.randomUUID().slice(0, 8);
  return {
    id,
    slug: id,
    name: "",
    brand: "",
    category: "Móveis",
    description: "",
    images: ["/catalogo/hotelaria-1-ambiente.webp"],
    sizes: ["Padrão"],
    colors: [
      {
        name: "Original",
        hex: "#dedbd4",
        image: "/catalogo/hotelaria-1-ambiente.webp",
      },
    ],
    priceCents: null,
    stock: null,
    active: false,
    featured: false,
    specs: {},
    variantInventory: {},
  };
}
function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}
function decimal(value: string) {
  return value.trim() === ""
    ? null
    : Math.round(Number(value.replace(",", ".")) * 100);
}
async function upload(file: File) {
  const data = new FormData();
  data.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", body: data });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Falha ao enviar imagem.");
  return result.url as string;
}
export default function Admin() {
  const s = useStore(),
    [tab, setTab] = useState("overview"),
    [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<Product | null>(null),
    [promotion, setPromotion] = useState<Promotion | null>(null),
    [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setData(await api("admin/dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    if (s.user?.role === "admin") load();
  }, [s.user]);
  // Refresh financial/order state without polling a hidden panel.
  useEffect(() => {
    if (
      s.user?.role !== "admin" ||
      !["overview", "orders", "cash"].includes(tab)
    )
      return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [tab, s.user]);
  const perform = async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      await api(path, method, body);
      await load();
      s.notify("Alteração salva.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!s.ready)
    return <div className="container empty-state">Carregando painel…</div>;
  if (s.user?.role !== "admin")
    return (
      <div className="container empty-state">
        <ShieldCheck size={42} />
        <h1>Um espaço reservado à equipe.</h1>
        <p>Entre com uma conta autorizada para administrar a VL Móveis.</p>
        <Link href="/conta" className="button">
          Ir para minha conta <ArrowUpRight size={17} />
        </Link>
      </div>
    );
  const revenue =
      data?.cash.filter((c) => c.order_id).reduce((n, c) => n + c.amount, 0) ||
      0,
    entries =
      data?.cash
        .filter((c) => c.direction === "in")
        .reduce((n, c) => n + c.amount, 0) || 0,
    exits =
      data?.cash
        .filter((c) => c.direction === "out")
        .reduce((n, c) => n + c.amount, 0) || 0;
  return (
    <div className="container admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow accent">VL MÓVEIS · PAINEL DA LOJA</span>
          <h1>Um olhar no seu negócio.</h1>
          <p>Olá, {s.user.name.split(" ")[0]}. Tudo no seu lugar.</p>
        </div>
        <button className="button button-outline" onClick={load}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Administração">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                setError("");
              }}
            >
              <t.icon size={18} />
              {t.label}
              {t.id === "orders" &&
              data?.orders.filter((o) => o.status === "pending").length ? (
                <span>
                  {data.orders.filter((o) => o.status === "pending").length}
                </span>
              ) : null}
            </button>
          ))}
          <Link href="/">
            Ver a loja <ArrowUpRight size={16} />
          </Link>
        </nav>
        <section className="admin-content">
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {!data ? (
            <p>Carregando informações…</p>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <h2>O que acontece na loja</h2>
                  <div className="metric-grid">
                    <Metric
                      label="Vendas confirmadas"
                      value={money(revenue)}
                      note="Somente pedidos com pagamento confirmado"
                    />
                    <Metric
                      label="Saldo do caixa"
                      value={money(entries - exits)}
                      note="Entradas menos saídas registradas"
                    />
                    <Metric
                      label="Pedidos aguardando"
                      value={String(
                        data.orders.filter((o) => o.status === "pending")
                          .length,
                      )}
                      note="Aguardando confirmação de pagamento"
                    />
                    <Metric
                      label="Clientes cadastrados"
                      value={String(data.counts.customers)}
                      note="Contas reais, sem cadastros de exemplo"
                    />
                  </div>
                  <div className="admin-two-columns">
                    <div className="panel">
                      <h3>Seu catálogo</h3>
                      <div className="summary-row">
                        <span>Produtos publicados</span>
                        <b>{data.products.filter((p) => p.active).length}</b>
                      </div>
                      <div className="summary-row">
                        <span>Com preço cadastrado</span>
                        <b>
                          {
                            data.products.filter((p) => p.priceCents !== null)
                              .length
                          }
                        </b>
                      </div>
                      <div className="summary-row">
                        <span>Estoque pendente de cadastro</span>
                        <b>
                          {
                            data.products.filter(
                              (p) =>
                                p.stock === null &&
                                !Object.keys(p.variantInventory).length,
                            ).length
                          }
                        </b>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => setTab("products")}
                      >
                        Organizar produtos <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="panel">
                      <h3>Próximos passos</h3>
                      <p>
                        Cadastre preços e quantidades reais. Combine frete e
                        condições de pagamento com o cliente antes de confirmar
                        o pedido.
                      </p>
                      <p className="muted">
                        Valores são atualizados a cada 15 segundos. Nenhuma
                        venda fictícia entra no caixa.
                      </p>
                      <button
                        className="text-link"
                        onClick={() => setTab("integrations")}
                      >
                        Ver integrações <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                  <h3>Pedidos recentes</h3>
                  <OrderTable
                    orders={data.orders.slice(0, 5)}
                    perform={perform}
                    busy={busy}
                  />
                </>
              )}
              {tab === "products" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Produtos e estoque</h2>
                      <p>
                        O catálogo é seu. Publique, ajuste ou arquive quando
                        precisar.
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() => setEdit(emptyProduct())}
                    >
                      <Plus size={16} /> Novo produto
                    </button>
                  </div>
                  <div className="admin-search">
                    <Search size={18} />
                    <input
                      placeholder="Buscar por nome, categoria ou código…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Buscar produtos no painel"
                    />
                  </div>
                  <div className="admin-product-list">
                    {data.products
                      .filter((p) =>
                        (
                          p.name +
                          " " +
                          p.id +
                          " " +
                          p.category +
                          " " +
                          (p.sourceText || "")
                        )
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <article key={p.id}>
                          <img
                            src={p.images[0]}
                            alt=""
                            width={70}
                            height={65}
                          />
                          <div>
                            <b>{p.name}</b>
                            <small>
                              {p.category} ·{" "}
                              {p.active ? "Publicado" : "Arquivado"}
                            </small>
                          </div>
                          <span>
                            {p.priceCents === null
                              ? "Sob consulta"
                              : money(p.priceCents)}
                            <small>
                              Estoque:{" "}
                              {p.stock === null ? "a cadastrar" : p.stock}
                              {Object.keys(p.variantInventory).length
                                ? " · por variação"
                                : ""}
                            </small>
                          </span>
                          <button
                            className="icon-button"
                            aria-label={"Editar " + p.name}
                            onClick={() => setEdit(structuredClone(p))}
                          >
                            <Pencil size={17} />
                          </button>
                          {p.active && (
                            <button
                              className="icon-button danger"
                              aria-label={"Arquivar " + p.name}
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Arquivar " +
                                      p.name +
                                      "? Ele sairá da vitrine. Pedidos e histórico serão preservados.",
                                  )
                                )
                                  perform("admin/products/" + p.id, "DELETE");
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </article>
                      ))}
                  </div>
                </>
              )}
              {tab === "orders" && (
                <>
                  <h2>Pedidos e clientes</h2>
                  <p className="muted">
                    Só marque “Pagamento recebido” depois de conferir o
                    recebimento. Isso baixa o estoque e lança a venda no caixa
                    uma única vez.
                  </p>
                  <div className="admin-search">
                    <Search size={18} />
                    <input
                      placeholder="Buscar cliente, e-mail, produto ou pedido…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Buscar pedidos"
                    />
                  </div>
                  <OrderTable
                    orders={data.orders.filter((o) =>
                      (o.id + " " + o.name + " " + o.email + " " + o.data)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )}
                    perform={perform}
                    busy={busy}
                  />
                </>
              )}
              {tab === "chat" && (
                <AdminChat
                  conversations={data.conversations}
                  onRefresh={load}
                />
              )}
              {tab === "promotions" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Banners e campanhas</h2>
                      <p>
                        Textos e fotos próprios. Carrossel animado na página
                        inicial.
                      </p>
                    </div>
                    <button
                      className="button"
                      onClick={() =>
                        setPromotion({
                          id: crypto.randomUUID(),
                          title: "",
                          subtitle: "",
                          cta: "Explorar produtos",
                          href: "/catalogo",
                          active: false,
                        })
                      }
                    >
                      <Plus size={16} /> Criar banner
                    </button>
                  </div>
                  <div className="promotion-list">
                    {data.promotions.length ? (
                      data.promotions.map((p) => (
                        <article className="panel" key={p.id}>
                          <span className="eyebrow accent">
                            {p.active ? "PUBLICADO" : "RASCUNHO"}
                          </span>
                          <h3>{p.title}</h3>
                          <p>{p.subtitle}</p>
                          <button
                            className="button button-outline"
                            onClick={() => setPromotion({ ...p })}
                          >
                            <Pencil size={15} /> Editar campanha
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state small">
                        <Megaphone size={35} />
                        <h3>Sua próxima campanha começa aqui.</h3>
                        <p>
                          Os destaques institucionais continuam na loja até você
                          publicar um banner.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              {tab === "cash" && (
                <>
                  <h2>Seu caixa, sem complicação.</h2>
                  <div className="metric-grid three">
                    <Metric
                      label="Entradas"
                      value={money(entries)}
                      note="Vendas e entradas manuais"
                    />
                    <Metric
                      label="Saídas"
                      value={money(exits)}
                      note="Despesas lançadas por você"
                    />
                    <Metric
                      label="Saldo registrado"
                      value={money(entries - exits)}
                      note="Não representa lucro contábil"
                    />
                  </div>
                  <CashForm onSave={perform} busy={busy} />
                  <h3>Movimentações registradas</h3>
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descrição</th>
                          <th>Tipo</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cash.length ? (
                          data.cash.map((c) => (
                            <tr key={c.id}>
                              <td>
                                {new Date(
                                  c.created_at + "Z",
                                ).toLocaleDateString("pt-BR", {
                                  timeZone: "America/Sao_Paulo",
                                })}
                              </td>
                              <td>{c.label}</td>
                              <td>
                                <span
                                  className={
                                    "status " +
                                    (c.direction === "in"
                                      ? "paid"
                                      : "cancelled")
                                  }
                                >
                                  {c.direction === "in" ? "Entrada" : "Saída"}
                                </span>
                              </td>
                              <td>{money(c.amount)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4}>
                              Nenhuma movimentação. Os valores aparecerão quando
                              houver registros reais.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {tab === "integrations" && (
                <>
                  <h2>Tudo conectado, no seu tempo.</h2>
                  <p>
                    O estoque e o caixa locais já conversam com os pedidos. Os
                    serviços externos precisam ser contratados e conectados
                    antes de processar cobranças ou cotações automáticas.
                  </p>
                  <div className="integration-grid">
                    {[
                      {
                        name: "Estoque da loja",
                        status: "Ativo nesta instalação",
                        text: "Reservas por pedido e baixa automática quando o pagamento é confirmado. Quantidades reais devem ser cadastradas.",
                      },
                      {
                        name: "Recebimento de pagamentos",
                        status: "A conectar",
                        text: "Nenhuma cobrança automática. A loja orienta o cliente e registra o recebimento após conferência.",
                      },
                      {
                        name: "Frete e logística",
                        status: "Entrega sob consulta",
                        text: "Retirada nas duas lojas e orçamento de entrega pelo WhatsApp. Nenhuma tarifa ou prazo é inventado.",
                      },
                      {
                        name: "Atendimento com IA",
                        status: "Atendimento humano ativo",
                        text: "Mensagens e histórico já ficam salvos. O robô ainda não está conectado; a equipe atende as conversas no painel.",
                      },
                    ].map((i) => (
                      <div className="panel" key={i.name}>
                        <ShieldCheck size={25} />
                        <h3>{i.name}</h3>
                        <span className="status pending">{i.status}</span>
                        <p>{i.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="legal-card">
                    <h3>Antes de abrir para vendas online</h3>
                    <p>
                      Revise os produtos dos catálogos antigos, cadastre preços
                      e estoque, confirme os endereços e horários das lojas e
                      defina pagamento e entrega. A conta do cliente funciona
                      sem depender desses serviços.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {edit && (
        <ProductEditor
          product={edit}
          saveError={error}
          onClose={() => setEdit(null)}
          onSave={async (p) => {
            if (await perform("admin/products", "PUT", p)) {
              setEdit(null);
            }
          }}
          busy={busy}
        />
      )}{" "}
      {promotion && (
        <PromotionEditor
          promotion={promotion}
          saveError={error}
          onClose={() => setPromotion(null)}
          onSave={async (p) => {
            if (await perform("admin/promotions", "PUT", p)) setPromotion(null);
          }}
          busy={busy}
        />
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function OrderTable({
  orders,
  perform,
  busy,
}: {
  orders: any[];
  perform: (path: string, method: string, body?: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Pedido / cliente</th>
            <th>Produtos</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? (
            orders.map((o) => {
              const details = JSON.parse(o.data);
              return (
                <tr key={o.id}>
                  <td>
                    <b>{o.id.slice(0, 8).toUpperCase()}</b>
                    <small>
                      {o.name}
                      <br />
                      {o.email}
                    </small>
                  </td>
                  <td>
                    {details.items.map((l: any) => (
                      <small key={l.productId + l.variant}>
                        {l.quantity}× {l.name}
                        <br />
                        {l.color} · {l.size}
                      </small>
                    ))}
                    <small>
                      <MapPin size={12} />{" "}
                      {o.delivery === "pickup-sepetiba"
                        ? "Sepetiba"
                        : "Campo Grande"}
                    </small>
                    {details.notes && (
                      <small>Observação: {details.notes}</small>
                    )}
                  </td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span className={"status " + o.status}>
                      {
                        (
                          {
                            pending: "Aguardando",
                            paid: "Pago",
                            completed: "Concluído",
                            cancelled: "Cancelado",
                          } as Record<string, string>
                        )[o.status]
                      }
                    </span>
                  </td>
                  <td>
                    {o.status === "pending" ? (
                      <>
                        <button
                          className="button button-dark compact"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                "Você conferiu o recebimento deste pagamento? Confirmar vai baixar o estoque e lançar a entrada no caixa.",
                              )
                            )
                              perform("admin/orders/" + o.id, "PATCH", {
                                status: "paid",
                              });
                          }}
                        >
                          Pagamento recebido
                        </button>
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                "Cancelar este pedido e liberar a reserva do estoque?",
                              )
                            )
                              perform("admin/orders/" + o.id, "PATCH", {
                                status: "cancelled",
                              });
                          }}
                        >
                          Cancelar pedido
                        </button>
                      </>
                    ) : o.status === "paid" ? (
                      <button
                        className="button button-outline compact"
                        disabled={busy}
                        onClick={() =>
                          perform("admin/orders/" + o.id, "PATCH", {
                            status: "completed",
                          })
                        }
                      >
                        Marcar entregue
                      </button>
                    ) : (
                      <span className="muted">Histórico preservado</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5}>Ainda não há pedidos nesta seleção.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function ProductEditor({
  product,
  onClose,
  onSave,
  busy,
  saveError,
}: {
  saveError: string;
  product: Product;
  onClose: () => void;
  onSave: (p: Product) => Promise<void>;
  busy: boolean;
}) {
  const ref = useDialog(onClose);
  const [p, setP] = useState(product),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [variantColor, setVariantColor] = useState(product.colors[0].name),
    [variantSize, setVariantSize] = useState(product.sizes[0]);
  const update = (patch: Partial<Product>) =>
    setP((prev) => ({ ...prev, ...patch }));
  const selectPhoto = async (file: File | undefined, colorIndex?: number) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await upload(file);
      if (colorIndex !== undefined) {
        setP((prev) => ({
          ...prev,
          images: [...new Set([...prev.images, url])],
          colors: prev.colors.map((c, i) =>
            i === colorIndex ? { ...c, image: url } : c,
          ),
        }));
      } else {
        setP((prev) => ({
          ...prev,
          images: [
            url,
            ...prev.images.filter(
              (img) => img !== "/catalogo/hotelaria-1-ambiente.webp",
            ),
          ],
          colors: prev.colors.map((c, i) =>
            i === 0 ? { ...c, image: url } : c,
          ),
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const vk = variantKey(variantColor, variantSize),
    inv = p.variantInventory[vk] || { priceCents: null, stock: null };
  const setVariant = (patch: Partial<typeof inv>) =>
    update({
      variantInventory: { ...p.variantInventory, [vk]: { ...inv, ...patch } },
    });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p.images[0] === "/catalogo/hotelaria-1-ambiente.webp" && p.active) {
      setError("Envie uma foto real do produto antes de publicar.");
      return;
    }
    setError("");
    await onSave(p);
  };
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <div className="modal-head">
          <h2 id="product-editor-title">
            {product.name ? "Editar produto" : "Seu novo produto"}
          </h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar editor"
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-columns">
            <label>
              Nome
              <input
                value={p.name}
                onChange={(e) => update({ name: e.target.value })}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
            <label>
              Marca
              <input
                value={p.brand}
                onChange={(e) => update({ brand: e.target.value })}
                maxLength={80}
              />
            </label>
            <label>
              Categoria
              <select
                value={p.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Preço em reais
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={p.priceCents === null ? "" : p.priceCents / 100}
                placeholder="Vazio = sob consulta"
                onChange={(e) =>
                  update({ priceCents: decimal(e.target.value) })
                }
              />
            </label>
            <label>
              Quantidade em estoque
              <input
                type="number"
                min="0"
                step="1"
                value={p.stock ?? ""}
                placeholder="Vazio = a confirmar"
                onChange={(e) =>
                  update({ stock: numberOrNull(e.target.value) })
                }
              />
            </label>
            <label>
              Medidas (uma por linha)
              <textarea
                value={p.sizes.join("\n")}
                onChange={(e) => update({ sizes: e.target.value.split("\n") })}
                onBlur={() =>
                  update({
                    sizes: [
                      ...new Set(p.sizes.map((s) => s.trim()).filter(Boolean)),
                    ],
                  })
                }
                required
              />
            </label>
          </div>
          <label>
            Descrição
            <textarea
              className="description-input"
              value={p.description}
              onChange={(e) => update({ description: e.target.value })}
              minLength={10}
              maxLength={10000}
              required
            />
          </label>
          <div className="image-editor">
            <img
              src={p.images[0]}
              alt="Foto atual do produto"
              width={120}
              height={100}
            />
            <label className="button button-outline">
              <ImagePlus size={16} />{" "}
              {uploading ? "Enviando…" : "Enviar foto principal"}
              <input
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => selectPhoto(e.target.files?.[0])}
              />
            </label>
            <small>JPG, PNG ou WebP · até 5 MB.</small>
          </div>
          <h3>Cores e fotografias</h3>
          <p className="muted">
            Envie a foto real de cada cor: o cliente verá esta imagem ao
            selecionar a variação.
          </p>
          {p.colors.map((c, i) => (
            <div className="color-editor" key={i}>
              <input
                aria-label={"Nome da cor " + (i + 1)}
                value={c.name}
                onChange={(e) =>
                  update({
                    colors: p.colors.map((x, n) =>
                      n === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
                required
              />
              <input
                type="color"
                aria-label={"Amostra da cor " + (i + 1)}
                value={c.hex}
                onChange={(e) =>
                  update({
                    colors: p.colors.map((x, n) =>
                      n === i ? { ...x, hex: e.target.value } : x,
                    ),
                  })
                }
              />
              <img
                src={c.image}
                alt={"Foto da cor " + c.name}
                width={70}
                height={50}
              />
              <label className="button button-outline compact">
                Trocar foto
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => selectPhoto(e.target.files?.[0], i)}
                />
              </label>
              {p.colors.length > 1 && (
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() =>
                    update({ colors: p.colors.filter((_, n) => n !== i) })
                  }
                  aria-label={"Remover cor " + c.name}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-link"
            onClick={() =>
              update({
                colors: [
                  ...p.colors,
                  {
                    name: "Nova cor " + (p.colors.length + 1),
                    hex: "#888888",
                    image: p.images[0],
                  },
                ],
              })
            }
          >
            <Plus size={16} /> Adicionar cor
          </button>
          <details className="variant-stock">
            <summary>Preço e estoque por cor / medida</summary>
            <p className="muted">
              Uma variação cadastrada substitui o preço e o estoque gerais.
              Campos vazios usam os valores gerais do produto.
            </p>
            <div className="form-columns">
              <label>
                Cor
                <select
                  value={variantColor}
                  onChange={(e) => setVariantColor(e.target.value)}
                >
                  {p.colors.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Medida
                <select
                  value={variantSize}
                  onChange={(e) => setVariantSize(e.target.value)}
                >
                  {p.sizes.map((size) => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
              </label>
              <label>
                Preço desta variação (R$)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={inv.priceCents === null ? "" : inv.priceCents / 100}
                  onChange={(e) =>
                    setVariant({ priceCents: decimal(e.target.value) })
                  }
                />
              </label>
              <label>
                Estoque desta variação
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={inv.stock ?? ""}
                  onChange={(e) =>
                    setVariant({ stock: numberOrNull(e.target.value) })
                  }
                />
              </label>
            </div>
            {Object.entries(p.variantInventory).map(([key, inv]) => (
              <div className="summary-row" key={key}>
                <small>
                  {JSON.parse(key).join(" · ")} —{" "}
                  {inv.priceCents === null
                    ? "Preço geral"
                    : money(inv.priceCents)}{" "}
                  —{" "}
                  {inv.stock === null
                    ? "Estoque geral"
                    : inv.stock + " unidades"}
                </small>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remover configuração da variação"
                  onClick={() => {
                    const next = { ...p.variantInventory };
                    delete next[key];
                    update({ variantInventory: next });
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </details>
          {p.source && (
            <a
              className="text-link"
              href={p.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Conferir no catálogo original <ArrowUpRight size={15} />
            </a>
          )}
          <div className="form-columns checks">
            <label className="check-label">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => update({ active: e.target.checked })}
              />{" "}
              Publicar na loja
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={p.featured}
                onChange={(e) => update({ featured: e.target.checked })}
              />{" "}
              Destacar no catálogo
            </label>
          </div>
          {(error || saveError) && (
            <p className="form-error" role="alert">
              {error || saveError}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Voltar
            </button>
            <button className="button" disabled={busy || uploading}>
              <Save size={16} />
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function PromotionEditor({
  promotion,
  onClose,
  onSave,
  busy,
  saveError,
}: {
  saveError: string;
  promotion: Promotion;
  onClose: () => void;
  onSave: (p: Promotion) => Promise<void>;
  busy: boolean;
}) {
  const ref = useDialog(onClose);
  const [p, setP] = useState(promotion),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
      >
        <div className="modal-head">
          <h2 id="promotion-title">Sua campanha na vitrine.</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(p);
          }}
        >
          <label>
            Título
            <textarea
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
              minLength={3}
              maxLength={100}
              required
            />
          </label>
          <label>
            Texto de apoio
            <textarea
              value={p.subtitle}
              onChange={(e) => setP({ ...p, subtitle: e.target.value })}
              maxLength={250}
            />
          </label>
          <label>
            Texto do botão
            <input
              value={p.cta}
              onChange={(e) => setP({ ...p, cta: e.target.value })}
              minLength={2}
              maxLength={40}
              required
            />
          </label>
          <label>
            Página de destino
            <input
              value={p.href}
              onChange={(e) => setP({ ...p, href: e.target.value })}
              placeholder="/catalogo"
              required
            />
          </label>
          <label className="button button-outline">
            <ImagePlus size={16} />
            {uploading ? "Enviando…" : "Enviar imagem do banner"}
            <input
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploading(true);
                  try {
                    setP({ ...p, image: await upload(f) });
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }
              }}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => setP({ ...p, active: e.target.checked })}
            />{" "}
            Publicar campanha na página inicial
          </label>
          <p className="muted">
            Use somente preços, descontos e condições reais. A loja não cria
            ofertas automaticamente.
          </p>
          {(error || saveError) && (
            <p className="form-error" role="alert">
              {error || saveError}
            </p>
          )}
          <button className="button" disabled={busy || uploading}>
            <Save size={16} /> Salvar campanha
          </button>
        </form>
      </section>
    </div>
  );
}
function CashForm({
  onSave,
  busy,
}: {
  onSave: (p: string, m: string, b?: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel cash-form">
      <div className="section-heading">
        <h3>Registrar uma movimentação</h3>
        <button
          className="button button-outline compact"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={16} /> : <Plus size={16} />}{" "}
          {open ? "Fechar" : "Novo lançamento"}
        </button>
      </div>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form);
            if (
              await onSave("admin/cash", "POST", {
                direction: f.get("direction"),
                label: f.get("label"),
                amount: decimal(String(f.get("amount"))),
              })
            ) {
              form.reset();
              setOpen(false);
            }
          }}
        >
          <div className="form-columns">
            <label>
              Tipo
              <select name="direction">
                <option value="out">Saída / despesa</option>
                <option value="in">Entrada</option>
              </select>
            </label>
            <label>
              Valor (R$)
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </label>
            <label>
              Descrição
              <input
                name="label"
                minLength={3}
                maxLength={160}
                placeholder="Ex.: aluguel, fornecedor…"
                required
              />
            </label>
          </div>
          <button className="button" disabled={busy}>
            Registrar no caixa
          </button>
        </form>
      )}
    </div>
  );
}
function AdminChat({
  conversations,
  onRefresh,
}: {
  conversations: any[];
  onRefresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<any[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const load = () =>
      api("admin/chat/" + selected)
        .then((d) => {
          if (active) setMessages(d.messages);
        })
        .catch((e: Error) => {
          if (active) setError(e.message);
        });
    load();
    const t = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [selected]);
  useEffect(() => {
    const t = setInterval(onRefresh, 12000);
    return () => clearInterval(t);
  }, [onRefresh]);
  return (
    <>
      <h2>Atendimento de perto.</h2>
      <p className="muted">
        As conversas ficam salvas, com o histórico completo de cada cliente.
      </p>
      <div className="admin-chat">
        <aside>
          {conversations.length ? (
            conversations.map((c) => (
              <button
                key={c.id}
                className={selected === c.id ? "active" : ""}
                onClick={() => {
                  setSelected(c.id);
                  setMessages([]);
                  setError("");
                }}
              >
                <span className="avatar">{c.name[0]}</span>
                <span>
                  <b>{c.name}</b>
                  <small>{c.email}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))
          ) : (
            <p>
              Nenhuma conversa ainda. As mensagens enviadas pelo site chegarão
              aqui.
            </p>
          )}
        </aside>
        <div className="admin-conversation">
          {selected ? (
            <>
              <div className="messages">
                {messages.map((m) => (
                  <div className={"message " + m.sender} key={m.id}>
                    <small>
                      {m.sender === "admin" ? "VL Móveis" : "Cliente"}
                    </small>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              <form
                className="chat-input"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSending(true);
                  try {
                    await api("admin/chat/" + selected, "POST", { text });
                    setText("");
                    setMessages((await api("admin/chat/" + selected)).messages);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  placeholder="Responder ao cliente…"
                  aria-label="Resposta ao cliente"
                  required
                />
                <button disabled={sending} aria-label="Enviar resposta">
                  <Send size={19} />
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state small">
              <MessageCircle size={35} />
              <h3>Escolha uma conversa.</h3>
              <p>Continue o atendimento de onde parou.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
