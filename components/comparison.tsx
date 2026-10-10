"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Scale, X } from "lucide-react";
import { type Product, money, variantPrice } from "@/lib/types";
import { useStore } from "./store-context";
import {
  assessComparison,
  commonMeasures,
  explanation,
  highlights,
  measureKey,
  unavailable,
  type Priority,
} from "@/lib/comparison";
export function Compare({ products }: { products: Product[] }) {
  const store = useStore();
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [priority, setPriority] = useState<Priority>("price");
  const [choices, setChoices] = useState<
    Record<string, { size: string; color: string }>
  >({});
  const items = store.compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  const common = commonMeasures(items);
  const selected = items.map((product) => {
    const size =
      choices[product.id]?.size ||
      product.sizes.find(
        (s) => common[0] && measureKey(s) === measureKey(common[0]),
      ) ||
      product.sizes[0];
    const color = choices[product.id]?.color || product.colors[0].name;
    return { product, size, color, price: variantPrice(product, color, size) };
  });
  const assessment = assessComparison(selected, priority);
  const keys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))].filter(
    (k) => !["Medidas", "Linha"].includes(k),
  );
  const rows = [
    {
      label: "Preço",
      values: selected.map((i) =>
        i.price === null ? "Sob consulta" : money(i.price),
      ),
    },
    { label: "Medida selecionada", values: selected.map((i) => i.size) },
    { label: "Cor selecionada", values: selected.map((i) => i.color) },
    ...keys.map((label) => ({
      label,
      values: items.map((p) =>
        unavailable(p.specs[label]) ? "Não informado" : p.specs[label],
      ),
    })),
  ];
  const visible = rows.filter(
    (r) =>
      r.label === "Preço" || !differencesOnly || new Set(r.values).size > 1,
  );
  return (
    <div className="container inner-page comparison-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow accent">COMPARAÇÃO</span>
          <h1>{items.length} produtos lado a lado</h1>
          <p>
            Compare composição, recursos e preço na medida que você pretende
            comprar.
          </p>
        </div>
      </div>
      {items.length ? (
        <>
          <section
            className="comparison-assessment"
            aria-labelledby="comparison-assessment-title"
          >
            <label>
              O que você prioriza?
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                aria-label="Prioridade da comparação"
              >
                <option value="price">Menor investimento</option>
                <option value="cotton">Revestimento 100% algodão</option>
                <option value="memory">Espuma viscoelástica</option>
                <option value="storage">Base com compartimento baú</option>
              </select>
            </label>
            <h2 id="comparison-assessment-title">{assessment.title}</h2>
            <p>{assessment.text}</p>
            {"savings" in assessment && assessment.savings && (
              <ul>
                {assessment.savings.map((s) => (
                  <li key={s.id}>
                    Economia de <strong>{money(s.amount)}</strong> (
                    {s.percent.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}
                    %) em relação a {s.name}, para as variações selecionadas.
                  </li>
                ))}
              </ul>
            )}
          </section>
          <label className="comparison-controls">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(e) => setDifferencesOnly(e.target.checked)}
            />{" "}
            Mostrar apenas diferenças
          </label>
          <button
            type="button"
            className="button button-outline comparison-clear"
            onClick={() => store.clearCompare()}
          >
            Limpar comparação
          </button>
          <div className="comparison-wrap">
            <table className="comparison">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Característica</span>
                  </th>
                  {selected.map(({ product: p, size, color }) => (
                    <th key={p.id}>
                      <button
                        className="remove-compare icon-button"
                        onClick={() => store.toggleCompare(p.id)}
                        aria-label={"Remover " + p.name}
                      >
                        <X size={18} />
                      </button>
                      <img
                        src={
                          p.colors.find((c) => c.name === color)?.image ||
                          p.images[0]
                        }
                        alt={p.name}
                        width={180}
                        height={180}
                      />
                      <small>{p.brand}</small>
                      <br />
                      <Link href={"/produto/" + p.slug}>{p.name}</Link>
                      <label className="comparison-variant">
                        Medida
                        <select
                          aria-label={"Medida de " + p.name}
                          value={size}
                          onChange={(e) =>
                            setChoices({
                              ...choices,
                              [p.id]: { size: e.target.value, color },
                            })
                          }
                        >
                          {p.sizes.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      {p.colors.length > 1 && (
                        <label className="comparison-variant">
                          Cor
                          <select
                            aria-label={"Cor de " + p.name}
                            value={color}
                            onChange={(e) =>
                              setChoices({
                                ...choices,
                                [p.id]: { size, color: e.target.value },
                              })
                            }
                          >
                            {p.colors.map((c) => (
                              <option key={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, i) => (
                      <td key={items[i].id}>
                        <strong>{value}</strong>
                        {row.label !== "Preço" && (
                          <p className="spec-explanation">
                            {explanation(row.label, value)}
                          </p>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">Principais características</th>
                  {items.map((p) => (
                    <td key={p.id}>
                      <ul className="comparison-highlights">
                        {highlights(p).map(([label, value]) => (
                          <li key={label}>
                            {label}: {value}
                          </li>
                        ))}
                      </ul>
                      {!highlights(p).length && (
                        <p>
                          Informações técnicas ainda não confirmadas para este
                          modelo.
                        </p>
                      )}
                    </td>
                  ))}
                </tr>
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
            Menor preço não significa melhor qualidade. A indicação depende da
            prioridade escolhida e das informações disponíveis. Limites de peso
            e características ausentes não são estimados.
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
