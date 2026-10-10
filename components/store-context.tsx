"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, Product, User } from "@/lib/types";
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api/" + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}
type Context = {
  user: User | null;
  ready: boolean;
  cart: CartLine[];
  compare: string[];
  favorites: string[];
  notice: string;
  notify: (s: string) => void;
  login: (u: User) => Promise<void>;
  logout: () => Promise<void>;
  setCart: (items: CartLine[]) => void;
  add: (p: Product, color: string, size: string) => void;
  toggleCompare: (id: string) => void;
  toggleFavorite: (id: string) => void;
};
const ctx = createContext<Context | null>(null);
const key = (l: CartLine) => JSON.stringify([l.productId, l.color, l.size]);
const read = (k: string, fallback: unknown) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
function merge(a: CartLine[], b: CartLine[]) {
  const map = new Map<string, CartLine>();
  for (const l of [...a, ...b]) {
    const old = map.get(key(l));
    map.set(key(l), {
      ...l,
      quantity: Math.min(20, (old?.quantity || 0) + l.quantity),
    });
  }
  return [...map.values()].slice(0, 30);
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [cart, saveCart] = useState<CartLine[]>([]),
    [compare, setCompare] = useState<string[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [notice, setNotice] = useState("");
  const writes = useRef(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (s: string) => {
    setNotice(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 4500);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const guest = read("vl_cart", []);
        const c = read("vl_compare", []);
        const f = read("vl_favorites", []);
        if (active) {
          setCompare(Array.isArray(c) ? c.slice(0, 4) : []);
          setFavorites(Array.isArray(f) ? f : []);
        }
        const { user: u } = await api<{ user: User | null }>("auth/me");
        if (!active) return;
        setUser(u);
        if (u) {
          const { items } = await api("cart");
          if (active) saveCart(items);
        } else saveCart(Array.isArray(guest) ? guest : []);
      } catch {
        if (active)
          notify(
            "Não conseguimos conectar à loja. Recarregue a página para tentar novamente.",
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const setCart = (items: CartLine[]) => {
    saveCart(items);
    if (user) {
      writes.current = writes.current
        .catch(() => {})
        .then(async () => {
          await api("cart", "PUT", items);
        })
        .catch((e: Error) =>
          notify("Não foi possível salvar a sacola: " + e.message),
        );
    } else {
      try {
        localStorage.setItem("vl_cart", JSON.stringify(items));
      } catch {
        notify("Sua sacola ficará disponível nesta página.");
      }
    }
  };
  const login = async (u: User) => {
    const { items } = await api<{ items: CartLine[] }>("cart");
    const joined = merge(items, cart);
    await api("cart", "PUT", joined);
    setUser(u);
    saveCart(joined);
    try {
      localStorage.removeItem("vl_cart");
    } catch {}
  };
  const logout = async () => {
    await api("auth/logout", "POST", {});
    setUser(null);
    saveCart([]);
    try {
      localStorage.removeItem("vl_cart");
    } catch {}
  };
  const add = (p: Product, color: string, size: string) => {
    if (!ready) {
      notify("Aguarde a loja carregar.");
      return;
    }
    const line = { productId: p.id, color, size, quantity: 1 };
    setCart(merge(cart, [line]));
    notify("Produto adicionado à sua sacola.");
  };
  const toggleCompare = (id: string) => {
    let next = compare.includes(id)
      ? compare.filter((x) => x !== id)
      : [...compare, id];
    if (next.length > 4) {
      notify("Você pode comparar até 4 produtos.");
      return;
    }
    setCompare(next);
    try {
      localStorage.setItem("vl_compare", JSON.stringify(next));
    } catch {}
  };
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("vl_favorites", JSON.stringify(next));
    } catch {}
  };
  return (
    <ctx.Provider
      value={{
        user,
        ready,
        cart,
        compare,
        favorites,
        notice,
        notify,
        login,
        logout,
        setCart,
        add,
        toggleCompare,
        toggleFavorite,
      }}
    >
      {children}
      <div
        className={"toast " + (notice ? "visible" : "")}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </ctx.Provider>
  );
}
export function useStore() {
  const c = useContext(ctx);
  if (!c) throw new Error("StoreProvider is required");
  return c;
}
