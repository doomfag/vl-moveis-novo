import test from "node:test";
import assert from "node:assert/strict";
import {
  assessComparison,
  commonMeasures,
  explanation,
  measureKey,
} from "../lib/comparison.ts";
const product = (
  id,
  specs = {},
  sizes = ["50 × 70 cm"],
  category = "Travesseiros",
) => ({ id, name: id, specs, sizes, category });
const entry = (
  id,
  price,
  specs = {},
  size = "50 × 70 cm",
  category = "Travesseiros",
) => ({
  product: product(id, specs, [size], category),
  size,
  color: "Original",
  price,
});
test("Comparação: sem preços informa limite, preservando comparação técnica", () => {
  const result = assessComparison(
    [entry("Soneca", null), entry("Pluma", null)],
    "price",
  );
  assert.match(result.title, /depende dos preços/);
  assert.equal(result.savings, undefined);
});
test("Comparação: mostra economia exata sem chamar menor preço de melhor qualidade", () => {
  const result = assessComparison(
    [entry("A", 8000), entry("B", 10000)],
    "price",
  );
  assert.equal(result.savings[0].amount, 2000);
  assert.equal(result.savings[0].percent, 20);
  assert.match(result.text, /A tem o menor preço/);
  assert.doesNotMatch(result.text, /melhor qualidade/);
});
test("Comparação: não recomenda preço para medidas ou categorias diferentes", () => {
  assert.match(
    assessComparison(
      [entry("A", 1000), entry("B", 2000, {}, "50 × 130 cm")],
      "price",
    ).title,
    /medidas equivalentes/,
  );
  assert.match(
    assessComparison(
      [entry("A", 1000), entry("B", 2000, {}, "50 × 70 cm", "Colchões")],
      "price",
    ).title,
    /categorias diferentes/,
  );
});
test("Comparação: preferência usa revestimento documentado, não nome comercial", () => {
  const result = assessComparison(
    [
      entry("Soneca", null, { Revestimento: "TNT 100% polipropileno" }),
      entry("Pluma", null, { Revestimento: "100% algodão" }),
    ],
    "cotton",
  );
  assert.match(result.text, /Pluma:/);
  assert.doesNotMatch(result.text, /Soneca:/);
  assert.match(
    assessComparison([entry("Algodão", null), entry("B", null)], "cotton")
      .title,
    /não confirmada/,
  );
});
test("Comparação: densidade não equivale a qualidade e medidas invertidas correspondem", () => {
  assert.match(explanation("Espuma", "D45"), /não uma nota de qualidade/);
  assert.equal(measureKey("138 × 188 cm"), measureKey("188 × 138 cm"));
  assert.deepEqual(
    commonMeasures([
      product("A", {}, ["188 × 138 cm", "198 × 158 cm"]),
      product("B", {}, ["138 × 188 cm"]),
    ]),
    ["188 × 138 cm"],
  );
  assert.equal(measureKey("Consultar medida"), "");
});
test("Comparação: igualdade de preço não gera ranking artificial", () => {
  const result = assessComparison(
    [entry("A", 10000), entry("B", 10000)],
    "price",
  );
  assert.match(result.title, /Mesmo preço/);
  assert.equal(result.savings, undefined);
});
