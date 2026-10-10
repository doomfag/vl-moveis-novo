import type { Product } from "./types";
export const unavailable = (value?: string) =>
  !value || /^(?:Consulte|Veja as especificações|Não informado)/i.test(value);
export function measureKey(size: string) {
  const parts = size.match(/\d+(?:[,.]\d+)?/g);
  return parts?.length === 2
    ? parts
        .map((p) => Number(p.replace(",", ".")))
        .sort((a, b) => a - b)
        .join("x")
    : "";
}
export function commonMeasures(items: Product[]) {
  return (
    items[0]?.sizes.filter(
      (size) =>
        measureKey(size) &&
        items.every((p) =>
          p.sizes.some((s) => measureKey(s) === measureKey(size)),
        ),
    ) || []
  );
}
export function explanation(label: string, value: string) {
  if (unavailable(value))
    return "O fabricante não informou esta característica para o modelo.";
  const text = value.toLowerCase();
  if (/enchimento|núcleo|estrutura de molas|espuma/i.test(label)) {
    if (/viscoel[aá]st/.test(text))
      return "Espuma de memória que se adapta à pressão. É uma proposta diferente da fibra solta; a preferência de toque é individual.";
    if (/fibra|poliéster.*silicon/.test(text))
      return "Preenchimento de fibras, diferente de um bloco de espuma. Compare também o revestimento e as medidas.";
    if (/flocos/.test(text))
      return "Enchimento em partes de espuma, diferente de um bloco único.";
    if (/pocket|ensacad/.test(text))
      return "Molas envolvidas individualmente. Compare também as camadas superiores e a firmeza informada.";
    if (/nanolastic|lfk|bic[oô]nic/.test(text))
      return "Estrutura de molas interligadas. O toque final também depende das camadas de espuma.";
    if (/\bD\s*\d{2}\b/i.test(value))
      return "O número indica a densidade da espuma, não uma nota de qualidade. Limite de peso e firmeza precisam ser confirmados separadamente.";
    if (/alta resili|hiper soft/i.test(text))
      return "Tipo de espuma informado pelo fabricante; não significa que este modelo seja melhor para todas as pessoas.";
    if (/madeira/.test(text))
      return "Estrutura de madeira. Confira também o acabamento e as medidas da base.";
  }
  if (/revestimento|material/i.test(label)) {
    if (/100%\s*algod/.test(text))
      return "Revestimento de algodão. É uma diferença de composição em relação ao poliéster ou ao TNT.";
    if (/polipropileno|TNT/i.test(value))
      return "Revestimento em tecido não tecido (TNT), diferente de algodão ou malha.";
    if (/poli[eé]ster/.test(text))
      return "Revestimento com poliéster. A textura varia conforme a construção do tecido.";
  }
  if (/fios/i.test(label))
    return "Contagem de fios informada para o tecido. Sozinha não determina o conforto do travesseiro.";
  if (/altura/i.test(label))
    return "Confira a compatibilidade com a cama e o uso pretendido. Maior altura não significa automaticamente melhor qualidade.";
  if (/suporta|capacidade/i.test(label))
    return "Limite declarado pelo fabricante. Escolha um modelo compatível com o uso, respeitando esse limite.";
  if (/armazenamento/i.test(label))
    return "Compartimento para guardar objetos. Compare espaço disponível e sistema de abertura.";
  if (/firmeza/i.test(label))
    return "Sensação de firmeza indicada pelo fabricante. A preferência é individual; a densidade não substitui essa informação.";
  if (/medidas/i.test(label))
    return "Use a mesma medida para comparar preços e confira o espaço disponível.";
  if (/abertura/i.test(label))
    return "Mecanismo utilizado para acessar o compartimento da base.";
  if (/cor/i.test(label))
    return "Cor selecionada para esta comparação. Preço e disponibilidade podem variar.";
  if (/lav[aá]vel/i.test(label))
    return "Siga as instruções específicas de lavagem do fabricante.";
  return "Característica declarada para este modelo. Consulte a descrição para os demais detalhes.";
}
export function highlights(product: Product) {
  return Object.entries(product.specs)
    .filter(
      ([key, value]) =>
        !["Medidas", "Linha"].includes(key) && !unavailable(value),
    )
    .slice(0, 5);
}
export type ComparisonSelection = {
  product: Product;
  size: string;
  color: string;
  price: number | null;
};
export type Priority = "price" | "cotton" | "memory" | "storage";
export function assessComparison(
  items: ComparisonSelection[],
  priority: Priority,
) {
  if (items.length < 2)
    return {
      title: "Selecione pelo menos dois produtos",
      text: "A comparação precisa de dois ou três modelos para identificar diferenças.",
    };
  const sameCategory = items.every(
    (i) => i.product.category === items[0].product.category,
  );
  const sameSize =
    measureKey(items[0].size) &&
    items.every((i) => measureKey(i.size) === measureKey(items[0].size));
  if (!sameCategory)
    return {
      title: "Produtos de categorias diferentes",
      text: "Compare suas características, mas escolha modelos da mesma categoria para avaliar preço e custo-benefício.",
    };
  if (priority !== "price") {
    const labels = {
      cotton: "revestimento 100% algodão",
      memory: "espuma viscoelástica",
      storage: "compartimento baú",
    };
    const matching = items.filter((i) => {
      const specs = i.product.specs;
      if (priority === "cotton")
        return /100%\s*algod[aã]o/i.test(
          specs.Revestimento || specs.Material || "",
        );
      if (priority === "memory")
        return /viscoel[aá]st/i.test(
          [specs.Enchimento, specs.Espuma, specs["Camada superior"]].join(" "),
        );
      return specs.Armazenamento === "Compartimento baú";
    });
    return matching.length
      ? {
          title: "Mais adequado à prioridade selecionada",
          text:
            matching.map((i) => i.product.name).join(" e ") +
            ": o fabricante informa " +
            labels[priority] +
            ". Isso atende ao critério escolhido; não é uma classificação geral de qualidade.",
        }
      : {
          title: "Característica não confirmada nestes modelos",
          text:
            "Não há informação documentada de " +
            labels[priority] +
            " nos produtos selecionados. Não classificamos um modelo por uma característica ausente.",
        };
  }
  if (!sameSize)
    return {
      title: "Selecione medidas equivalentes",
      text: "Os preços de medidas diferentes não são usados para indicar o menor investimento. Se não houver medida em comum, compare apenas as características.",
    };
  if (items.some((i) => i.price === null))
    return {
      title: "Custo-benefício depende dos preços",
      text: "Ainda falta o preço de uma ou mais variações selecionadas. As características podem ser comparadas agora; a diferença de valores aparecerá quando a loja cadastrar esses preços.",
    };
  const cheapest = Math.min(...items.map((i) => i.price!));
  const winners = items.filter((i) => i.price === cheapest);
  if (winners.length === items.length)
    return {
      title: "Mesmo preço na medida selecionada",
      text: "Não há economia de preço entre estes modelos. Compare composição, estrutura e recursos para escolher a opção adequada ao uso.",
    };
  const savings = items
    .filter((i) => i.price !== cheapest)
    .map((i) => ({
      id: i.product.id,
      name: i.product.name,
      amount: i.price! - cheapest,
      percent: ((i.price! - cheapest) / i.price!) * 100,
    }));
  return {
    title: "Menor investimento",
    text:
      winners.map((i) => i.product.name).join(" e ") +
      " tem o menor preço na medida selecionada. Compare abaixo o que muda nos modelos mais caros antes de decidir se o valor adicional atende à sua necessidade.",
    savings,
  };
}
