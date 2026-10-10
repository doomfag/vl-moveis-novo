"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Armchair,
  Search,
  UserRound,
  ShoppingBag,
  Heart,
  Menu,
  X,
  MapPin,
  MessageCircle,
  ArrowUpRight,
  Camera,
  ShieldCheck,
  Scale,
  Send,
  ChevronRight,
} from "lucide-react";
import { useStore, api } from "./store-context";
import { type Product, whatsapp } from "@/lib/types";
const categories = [
  "Colchões",
  "Bases e camas",
  "Cabeceiras",
  "Travesseiros",
  "Móveis",
  "Eletros",
  "Hotelaria",
  "Acessórios",
];
export function Header() {
  const s = useStore(),
    [menu, setMenu] = useState(false),
    path = usePathname();
  useEffect(() => setMenu(false), [path]);
  const count = s.cart.reduce((n, l) => n + l.quantity, 0);
  return (
    <>
      <div className="announcement">
        <span>VL Móveis · Móveis e colchões</span>
        <span className="desktop">
          <MapPin size={12} /> Sepetiba e Campo Grande · Rio de Janeiro
        </span>
        <a
          href={whatsapp("Olá! Gostaria de falar com a VL Móveis.")}
          target="_blank"
          rel="noreferrer"
        >
          Atendimento <ArrowUpRight size={13} />
        </a>
      </div>
      <header className="header">
        <div className="container header-main">
          <button
            className="icon-button mobile"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <Link href="/" className="brand" aria-label="VL Móveis, início">
            <img
              className="brand-logo"
              src="/logo-vl.png"
              width={70}
              height={58}
              alt="VL"
            />
            <span>
              <strong>
                VL<span> Móveis</span>
              </strong>
            </span>
          </Link>
          <form action="/catalogo" className="search">
            <input
              name="q"
              aria-label="Buscar produtos"
              placeholder="Buscar produtos"
              autoComplete="off"
            />
            <button aria-label="Buscar">
              <Search size={22} />
            </button>
          </form>
          <div className="header-actions">
            <Link href="/conta" className="account-link">
              <UserRound size={23} />
              <span>
                <small>{s.user ? "Bem-vindo(a)," : "Bem-vindo(a)!"}</small>
                <b>
                  {s.user ? s.user.name.split(" ")[0] : "Entre ou cadastre-se"}
                </b>
              </span>
            </Link>
            <Link
              href="/favoritos"
              className="icon-button desktop"
              aria-label="Favoritos"
            >
              <Heart size={23} />
            </Link>
            <Link
              href="/sacola"
              className="bag icon-button"
              aria-label={`Sacola com ${count} produtos`}
            >
              <ShoppingBag size={24} />
              <span className="badge-count">{count}</span>
            </Link>
          </div>
        </div>
        <nav
          className={"container nav " + (menu ? "nav-open" : "")}
          aria-label="Categorias"
        >
          <Link href="/catalogo" className="all-categories">
            <Menu size={17} /> Todos os produtos
          </Link>
          {categories.slice(0, 6).map((c) => (
            <Link key={c} href={"/catalogo?categoria=" + encodeURIComponent(c)}>
              {c}
            </Link>
          ))}
          <Link href="/ajuda" className="nav-special">
            Ajuda
          </Link>
        </nav>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="container footer-grid">
          <div>
            <Link href="/" className="brand light">
              <img
                className="brand-logo"
                src="/logo-vl.png"
                width={70}
                height={58}
                alt="VL"
              />
              <span>
                <strong>VL Móveis</strong>
              </span>
            </Link>
            <p>
              Móveis, colchões e eletros.
              <br />
              Sepetiba e Campo Grande.
            </p>
            <a
              className="social"
              href="https://www.instagram.com/vlmoveis2018/"
              target="_blank"
              rel="noreferrer"
            >
              <Camera size={18} /> @vlmoveis2018 <ArrowUpRight size={15} />
            </a>
          </div>
          <div>
            <h3>Produtos</h3>
            {categories.slice(0, 4).map((c) => (
              <Link
                key={c}
                href={"/catalogo?categoria=" + encodeURIComponent(c)}
              >
                {c}
              </Link>
            ))}
            <Link href="/comparar">Compare produtos</Link>
          </div>
          <div>
            <h3>Atendimento</h3>
            <Link href="/lojas">Loja em Sepetiba</Link>
            <Link href="/lojas">Loja em Campo Grande</Link>
            <a
              href={whatsapp("Olá, VL Móveis! Preciso de atendimento.")}
              target="_blank"
              rel="noreferrer"
            >
              (21) 99001-5722
            </a>
            <Link href="/conta">Minha conta e pedidos</Link>
          </div>
          <div>
            <h3>Informações</h3>
            <Link href="/ajuda">Ajuda e perguntas frequentes</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Compras e entregas</Link>
            <div className="footer-security">
              <ShieldCheck size={22} />
              <span>
                Política de privacidade
                <br />e proteção de dados.
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>
          VL Móveis · CNPJ 39.930.081/0001-64
          <br />
          Sede Administrativa: Estrada do Piaí, nº 6269 · Rio de Janeiro – RJ ·
          CEP 23545-353
        </p>
        <span>VL Móveis</span>
      </div>
    </footer>
  );
}
type Message = { id: string; sender: string; text: string; created_at: string };
export function Chat() {
  const s = useStore(),
    [open, setOpen] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !s.user) return;
    let active = true;
    const load = () =>
      api("chat")
        .then((d) => {
          if (active) {
            setMessages(d.messages);
            setError("");
          }
        })
        .catch((e: Error) => {
          if (active) setError(e.message);
        });
    load();
    const t = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [open, s.user]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    try {
      await api("chat", "POST", { text });
      setText("");
      setMessages((await api("chat")).messages);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <button
        className="chat-launcher"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Fechar atendimento" : "Abrir atendimento"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span>{open ? "Fechar" : "Atendimento"}</span>
      </button>
      {open && (
        <section className="chat-window" aria-label="Atendimento VL Móveis">
          <div className="chat-head">
            <span className="brand-icon">
              <Armchair size={20} />
            </span>
            <div>
              <b>Atendimento VL Móveis</b>
              <small>Atendimento da loja</small>
            </div>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
            >
              <X size={18} />
            </button>
          </div>
          {s.user ? (
            <>
              <div className="messages">
                {!messages.length && (
                  <p className="chat-welcome">
                    Oi, {s.user.name.split(" ")[0]}! Como podemos ajudar? Envie
                    sua mensagem; nossa equipe responderá aqui.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={"message " + m.sender}>
                    <small>{m.sender === "admin" ? "VL Móveis" : "Você"}</small>
                    <p>{m.text}</p>
                  </div>
                ))}
                <div ref={end} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <form className="chat-input" onSubmit={send}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escreva sua mensagem…"
                  maxLength={2000}
                  aria-label="Mensagem"
                  required
                />
                <button disabled={sending} aria-label="Enviar mensagem">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <h3>É bom ter você aqui.</h3>
              <p>
                Entre na sua conta para conversar e acompanhar o histórico do
                atendimento.
              </p>
              <Link
                href="/conta"
                className="button"
                onClick={() => setOpen(false)}
              >
                Entrar na minha conta <ChevronRight size={16} />
              </Link>
              <a
                href={whatsapp("Olá! Quero falar com a VL Móveis.")}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Prefiro o WhatsApp <ArrowUpRight size={15} />
              </a>
            </div>
          )}
        </section>
      )}
    </>
  );
}
export function CompareDock() {
  const s = useStore(),
    path = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (s.compare.length)
      api("products")
        .then((d) => setProducts(d.products))
        .catch(() => {});
  }, [s.compare.length]);
  const items = s.compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  return s.compare.length && path !== "/comparar" ? (
    <div
      className="compare-dock"
      aria-label="Produtos selecionados para comparação"
    >
      <div className="compare-chips">
        <Scale size={20} />
        {items.map((p) => (
          <div className="compare-chip" key={p.id}>
            <img src={p.images[0]} alt="" width={40} height={34} />
            <span>{p.name}</span>
            <button
              onClick={() => s.toggleCompare(p.id)}
              aria-label={"Remover " + p.name + " da comparação"}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="compare-actions">
        <button className="compare-clear" onClick={s.clearCompare}>
          Limpar
        </button>
        <Link href="/comparar" className="button button-dark">
          Comparar ({s.compare.length})
        </Link>
      </div>
    </div>
  ) : null;
}
