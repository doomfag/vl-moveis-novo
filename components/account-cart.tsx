"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  UserRound,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  Trash2,
  Minus,
  Plus,
  Check,
  LogOut,
  ShieldCheck,
  Package,
  MapPin,
} from "lucide-react";
import { useStore, api } from "./store-context";
import { type Product, variantPrice, money, whatsapp } from "@/lib/types";
export function Account() {
  const s = useStore(),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pendingEmail, setPendingEmail] = useState(""),
    [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    if (s.user)
      api("orders")
        .then((d) => setOrders(d.orders))
        .catch((e: Error) => setError(e.message));
    else setOrders([]);
  }, [s.user]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    if (register && fields.get("password") !== fields.get("passwordConfirm")) {
      setError("As senhas precisam ser iguais.");
      setBusy(false);
      return;
    }
    try {
      const data = await api(
        register ? "auth/register" : "auth/login",
        "POST",
        register
          ? {
              name: fields.get("name"),
              email: fields.get("email"),
              password: fields.get("password"),
            }
          : { email: fields.get("email"), password: fields.get("password") },
      );
      if (data.requiresVerification) {
        setMessage(data.message);
        setPendingEmail(data.email);
        setRegister(false);
        return;
      }
      await s.login(data.user);
      s.notify(
        register
          ? "Sua conta foi criada. Seja bem-vindo(a)!"
          : "Que bom ter você de volta!",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!s.ready)
    return <div className="container empty-state">Carregando sua conta…</div>;
  if (s.user)
    return (
      <div className="container inner-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow accent">SEU CANTINHO NA VL</span>
            <h1>Olá, {s.user.name.split(" ")[0]}.</h1>
            <p>É bom ter você por aqui.</p>
          </div>
          <button
            className="button button-outline"
            onClick={() => s.logout().catch((e: Error) => s.notify(e.message))}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
        <div className="account-quick-links">
          <Link href="/sacola">
            <ShoppingBag /> Minha sacola <ArrowUpRight size={17} />
          </Link>
          <Link href="/favoritos">
            <UserRound /> Meus favoritos <ArrowUpRight size={17} />
          </Link>
          {s.user.role === "admin" && (
            <Link href="/admin">
              <ShieldCheck /> Painel da loja <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
        <section className="section">
          <h2>Seus pedidos</h2>
          {error && <p className="form-error">{error}</p>}
          {orders.length ? (
            <div className="orders-list">
              {orders.map((o) => {
                const data = JSON.parse(o.data);
                return (
                  <article key={o.id} className="order-card">
                    <div>
                      <Package />
                      <h3>Pedido {o.id.slice(0, 8).toUpperCase()}</h3>
                      <span className={"status " + o.status}>
                        {
                          (
                            {
                              pending: "Aguardando confirmação",
                              paid: "Pagamento confirmado",
                              completed: "Concluído",
                              cancelled: "Cancelado",
                            } as Record<string, string>
                          )[o.status]
                        }
                      </span>
                    </div>
                    <p>
                      {data.items
                        .map((l: any) => l.quantity + "× " + l.name)
                        .join(" · ")}
                    </p>
                    <div>
                      <b>{money(o.total)}</b>
                      <a
                        className="text-link"
                        href={whatsapp(
                          "Olá! Gostaria de falar sobre o pedido " + o.id + ".",
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Falar sobre este pedido <ArrowUpRight size={15} />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state small">
              <Package size={36} />
              <h3>Seu primeiro conforto está esperando.</h3>
              <p>Os pedidos feitos nesta conta aparecerão aqui.</p>
              <Link className="button" href="/catalogo">
                Explorar produtos <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
        <div className="legal-card">
          <h3>Dados da sua conta</h3>
          <p>
            {s.user.name}
            <br />
            {s.user.email}
          </p>
          <p className="muted">
            Para corrigir dados, solicitar exclusão ou recuperar acesso, fale
            com nossa equipe.
          </p>
          <a
            className="text-link"
            href={whatsapp(
              "Olá! Preciso de ajuda com minha conta na VL Móveis.",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Pedir ajuda <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    );
  return (
    <div className="container account-page">
      <div className="account-story">
        <span className="eyebrow accent">BEM-VINDO À VL MÓVEIS</span>
        <h1>Minha conta VL Móveis</h1>
        <p>
          Guarde suas escolhas, acompanhe seus pedidos e converse com a gente em
          um só lugar.
        </p>
        <div>
          <ShieldCheck size={20} /> Uma conta só sua, com senha protegida.
        </div>
        <img
          src="/catalogo/hotelaria-1-ambiente.webp"
          alt="Quarto confortável"
          width={600}
          height={440}
        />
      </div>
      <div className="account-form">
        <div className="account-tabs">
          <button
            className={!register ? "active" : ""}
            onClick={() => {
              setRegister(false);
              setError("");
            }}
          >
            Entrar
          </button>
          <button
            className={register ? "active" : ""}
            onClick={() => {
              setRegister(true);
              setError("");
            }}
          >
            Criar conta
          </button>
        </div>
        <h2>{register ? "Criar conta" : "Entrar"}</h2>
        <p>
          {register
            ? "São só alguns detalhes para começar."
            : "Entre para continuar de onde parou."}
        </p>
        {message && (
          <div className="auth-notice" role="status">
            <p>{message}</p>
            {pendingEmail && <p>E-mail: {pendingEmail}</p>}
          </div>
        )}
        <form onSubmit={submit}>
          {register && (
            <label>
              Seu nome
              <input
                name="name"
                placeholder="Como podemos chamar você?"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}
          <label>
            E-mail
            <input
              name="email"
              type="email"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              placeholder={register ? "Pelo menos 12 caracteres" : "Sua senha"}
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 12 : 1}
              maxLength={128}
              required
            />
          </label>
          {register && (
            <label>
              Confirmar senha
              <input
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
          )}
          {register && (
            <small className="muted">
              Use uma senha exclusiva com pelo menos 12 caracteres. Ao criar sua
              conta, você conhece nossa{" "}
              <Link href="/privacidade">política de privacidade</Link>.
            </small>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Só um instante…"
              : register
                ? "Criar minha conta"
                : "Entrar na minha conta"}
            <ArrowUpRight size={17} />
          </button>
        </form>
        {!register && (
          <div className="account-help">
            <Link href="/recuperar-senha" className="text-link">
              Esqueci minha senha
            </Link>
            <Link href="/reenviar-confirmacao" className="text-link">
              Reenviar confirmação de e-mail
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
export function Cart({ products }: { products: Product[] }) {
  const s = useStore(),
    [delivery, setDelivery] = useState("pickup-sepetiba"),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState<{ id: string; total: number } | null>(
      null,
    );
  const lines = s.cart.map((l, index) => ({
    line: l,
    index,
    p: products.find((p) => p.id === l.productId),
  }));
  const unknown = lines.some(
    ({ line, p }) => !p || variantPrice(p, line.color, line.size) === null,
  );
  const total = lines.reduce(
    (n, { line, p }) =>
      n +
      (p ? (variantPrice(p, line.color, line.size) || 0) * line.quantity : 0),
    0,
  );
  const quote =
    "Olá! Gostaria de um orçamento para minha sacola:\n" +
    lines
      .map(
        ({ line, p }) =>
          `${line.quantity}× ${p?.name || "Produto indisponível"} — ${line.color}, ${line.size}`,
      )
      .join("\n") +
    "\nEntrega ou retirada: a combinar.";
  const quantity = (index: number, delta: number) => {
    const next = s.cart
      .map((l, i) =>
        i === index ? { ...l, quantity: Math.min(20, l.quantity + delta) } : l,
      )
      .filter((l) => l.quantity > 0);
    s.setCart(next);
  };
  const order = async () => {
    if (!s.user) {
      setError("Entre na sua conta para enviar seu pedido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api("orders", "POST", { items: s.cart, delivery, notes });
      setConfirmed(r.order);
      s.setCart([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!s.ready)
    return <div className="container empty-state">Carregando sua sacola…</div>;
  return (
    <div className="container inner-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow accent">SUAS PRÓXIMAS BOAS ESCOLHAS</span>
          <h1>Sua sacola.</h1>
          <p>Um passo mais perto de se sentir em casa.</p>
        </div>
        <Link href="/catalogo" className="text-link">
          Continuar explorando <ArrowUpRight size={17} />
        </Link>
      </div>
      {confirmed ? (
        <div className="empty-state order-success">
          <span className="success-icon">
            <Check size={35} />
          </span>
          <h2>Pedido recebido pela loja.</h2>
          <p>
            Pedido <b>{confirmed.id.slice(0, 8).toUpperCase()}</b> ·{" "}
            {money(confirmed.total)}
            <br />
            Aguardando confirmação e orientação de pagamento. Nenhum valor foi
            cobrado.
          </p>
          <a
            className="button"
            href={whatsapp(
              "Olá! Enviei o pedido " +
                confirmed.id +
                " e gostaria de confirmar os detalhes e o pagamento.",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Combinar com a loja <ArrowUpRight size={17} />
          </a>
          <Link className="text-link" href="/conta">
            Acompanhar na minha conta
          </Link>
        </div>
      ) : lines.length ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map(({ line, index, p }) => (
              <article
                key={JSON.stringify([line.productId, line.color, line.size])}
                className="cart-line"
              >
                <Link href={p ? "/produto/" + p.slug : "/catalogo"}>
                  <img
                    src={
                      p?.colors.find((c) => c.name === line.color)?.image ||
                      p?.images[0]
                    }
                    alt={p?.name || "Produto indisponível"}
                    width={160}
                    height={130}
                  />
                </Link>
                <div>
                  <Link
                    href={p ? "/produto/" + p.slug : "/catalogo"}
                    className="cart-line-name"
                  >
                    {p?.name || "Produto indisponível"}
                  </Link>
                  <p>
                    {line.color} · {line.size}
                  </p>
                  <strong>
                    {p && variantPrice(p, line.color, line.size) !== null
                      ? money(variantPrice(p, line.color, line.size)!)
                      : "Preço sob consulta"}
                  </strong>
                  <div className="quantity">
                    <button
                      onClick={() => quantity(index, -1)}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={14} />
                    </button>
                    <span aria-label="Quantidade">{line.quantity}</span>
                    <button
                      onClick={() => quantity(index, 1)}
                      disabled={line.quantity >= 20}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <button
                  className="icon-button remove-line"
                  aria-label={"Remover " + (p?.name || "produto")}
                  onClick={() =>
                    s.setCart(s.cart.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
            <div className="cart-help">
              <ShieldCheck size={20} />
              <p>
                Antes de fechar, confirme as medidas, o acesso ao local de
                entrega e as condições de montagem com a nossa equipe.
              </p>
            </div>
          </div>
          <aside className="cart-summary">
            <h2>Uma boa escolha.</h2>
            <div className="summary-row">
              <span>Produtos com preço cadastrado</span>
              <b>{money(total)}</b>
            </div>
            <div className="summary-row">
              <span>Entrega</span>
              <span>A combinar</span>
            </div>
            <div className="summary-total">
              <span>{unknown ? "Orçamento" : "Subtotal dos produtos"}</span>
              <strong>{unknown ? "Sob consulta" : money(total)}</strong>
            </div>
            {unknown ? (
              <>
                <p>
                  Há produtos sob consulta na sacola. Envie sua seleção para
                  receber um orçamento completo.
                </p>
                <a
                  className="button"
                  href={whatsapp(quote)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pedir orçamento da sacola <ArrowUpRight size={18} />
                </a>
              </>
            ) : (
              <>
                <label>
                  Retirada
                  <select
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                  >
                    <option value="pickup-sepetiba">Loja Sepetiba</option>
                    <option value="pickup-campo-grande">
                      Loja Campo Grande
                    </option>
                  </select>
                </label>
                <p className="muted">
                  Para entregar no seu endereço, peça um orçamento à loja antes
                  de pagar.
                </p>
                <label>
                  Algum detalhe para a equipe?
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                    placeholder="Opcional"
                  />
                </label>
                {!s.user ? (
                  <Link href="/conta" className="button">
                    Entrar para enviar o pedido <ArrowRight size={17} />
                  </Link>
                ) : (
                  <button className="button" onClick={order} disabled={busy}>
                    {busy ? "Enviando…" : "Enviar pedido à loja"}
                    <ArrowUpRight size={17} />
                  </button>
                )}
                <small>
                  O pedido ficará aguardando confirmação. Não há cobrança
                  automática.
                </small>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <a
              className="text-link"
              href={whatsapp(quote)}
              target="_blank"
              rel="noreferrer"
            >
              Combinar entrega pelo WhatsApp <ArrowUpRight size={15} />
            </a>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <ShoppingBag size={42} />
          <h2>Ainda tem espaço para boas escolhas.</h2>
          <p>Explore a loja e encontre o conforto que combina com você.</p>
          <Link className="button" href="/catalogo">
            Encontrar meu conforto <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
