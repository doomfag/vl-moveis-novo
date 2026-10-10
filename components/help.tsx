"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { whatsapp } from "@/lib/types";

export function Credit() {
  return (
    <section className="credit-section" aria-labelledby="credit-title">
      <div>
        <h2 id="credit-title">Cartão VL Móveis e crediário</h2>
        <p>
          Parcelamento em até 36 vezes, sujeito à análise da financeira, com
          consulta ao SPC e Serasa. A quantidade de parcelas e os valores
          dependem da aprovação e das condições oferecidas.
        </p>
        <p>
          A solicitação do cartão da loja e do crediário é feita pelo WhatsApp
          ou na loja. Essas modalidades não são contratadas pelo site.
        </p>
      </div>
      <a
        className="button button-dark"
        href={whatsapp(
          "Olá! Gostaria de saber sobre o cartão da loja e o crediário da VL Móveis.",
        )}
        target="_blank"
        rel="noreferrer"
      >
        Consultar pelo WhatsApp <ArrowUpRight size={17} />
      </a>
    </section>
  );
}
const categories = [
  "Todos",
  "Entrega e frete",
  "Pagamento",
  "Escolha do produto",
  "Garantia e devolução",
  "Conta e pedidos",
];
const questions: { category: string; question: string; answer: string }[] = [
  {
    category: "Entrega e frete",
    question: "Quanto custa o frete?",
    answer:
      "O valor depende do endereço e do produto. Informe seu CEP e os produtos à equipe pelo WhatsApp para confirmar o orçamento antes do pedido.",
  },
  {
    category: "Entrega e frete",
    question: "Em quanto tempo chega?",
    answer:
      "Confirme o prazo com a loja. Ele depende do estoque, endereço e disponibilidade de entrega. O site não calcula um prazo automático.",
  },
  {
    category: "Entrega e frete",
    question: "Quem faz a entrega?",
    answer:
      "A loja informa a equipe responsável e as condições de entrega ao confirmar seu pedido.",
  },
  {
    category: "Entrega e frete",
    question: "Preciso estar em casa para receber?",
    answer:
      "Combine com a loja quem receberá o produto e informe eventuais restrições de acesso, escadas ou elevadores antes da entrega.",
  },
  {
    category: "Entrega e frete",
    question: "Vocês entregam fora do Rio de Janeiro?",
    answer:
      "Consulte a cobertura de entrega com a equipe, informando seu CEP. Não há cobertura automática confirmada pelo site.",
  },
  {
    category: "Pagamento",
    question: "Vocês têm cartão da loja e crediário?",
    answer:
      "Sim. O cartão VL Móveis e o crediário permitem parcelamento em até 36 vezes, sujeito à análise da financeira com consulta ao SPC e Serasa. Parcelas e valores dependem da aprovação. Solicite pelo WhatsApp ou na loja; essas modalidades não são contratadas pelo site.",
  },
  {
    category: "Pagamento",
    question: "Quais formas de pagamento vocês aceitam?",
    answer:
      "Além do cartão da loja e do crediário, há pagamento por cartão e Pix. Confirme com a equipe as condições disponíveis para seu pedido. O site registra pedidos e orçamentos, mas ainda não realiza cobrança automática por Pix, cartão ou boleto.",
  },
  {
    category: "Pagamento",
    question: "Em quantas vezes posso parcelar?",
    answer:
      "Cartão VL Móveis e crediário: até 36 parcelas, sujeito à aprovação da financeira. Para outros cartões, consulte com a loja o número de parcelas, valores e eventuais juros.",
  },
  {
    category: "Pagamento",
    question: "Posso informar os dados do cartão no site?",
    answer:
      "O site ainda não possui pagamento automático nem formulário para dados do cartão. Combine o pagamento com a loja. Nunca envie senha ou código de segurança do cartão pelo chat.",
  },
  {
    category: "Pagamento",
    question: "Vem nota fiscal?",
    answer:
      "Confirme os dados necessários para emissão e o envio da nota fiscal com a loja ao fechar a compra. Guarde o documento para atendimento e garantia.",
  },
  {
    category: "Escolha do produto",
    question: "O que significa D33, D45 e molas ensacadas?",
    answer:
      "D33 e D45 indicam a densidade nominal da espuma, em quilogramas por metro cúbico. Molas ensacadas são molas envolvidas individualmente. Densidade, firmeza e limite de peso são características diferentes: consulte as especificações do modelo.",
  },
  {
    category: "Escolha do produto",
    question: "Como sei qual produto é o certo para mim?",
    answer:
      "Compare medidas, materiais e características informadas na página do produto. Confira o espaço disponível, a base utilizada e as necessidades de uso. A equipe pode ajudar com dúvidas sobre os modelos.",
  },
  {
    category: "Escolha do produto",
    question: "As fotos correspondem ao produto?",
    answer:
      "Usamos fotos dos modelos nos documentos do fabricante fornecidos à loja. Alguns travesseiros têm apenas foto da embalagem. Não criamos fotos de outros ângulos ou substituímos por modelos semelhantes. Confirme modelo, cor, medida e disponibilidade antes do pedido.",
  },
  {
    category: "Escolha do produto",
    question: "Os produtos são originais e novos?",
    answer:
      "Os modelos apresentados foram identificados nos documentos do fabricante. Confirme com a loja a condição e disponibilidade do item, especialmente quando se tratar de peça de exposição.",
  },
  {
    category: "Escolha do produto",
    question: "Vocês montam o móvel na entrega?",
    answer:
      "Consulte se há montagem para o produto escolhido, seu custo e agendamento. O site não inclui montagem automaticamente.",
  },
  {
    category: "Escolha do produto",
    question: "Posso ver o produto antes de comprar?",
    answer:
      "Consulte a disponibilidade do modelo para exposição em Sepetiba ou Campo Grande e confirme o endereço e horário antes da visita.",
  },
  {
    category: "Garantia e devolução",
    question: "Qual é a garantia dos produtos?",
    answer:
      "A garantia varia por produto e fabricante. Consulte o prazo e o termo aplicável ao modelo com a loja. Os direitos previstos em lei permanecem assegurados.",
  },
  {
    category: "Garantia e devolução",
    question: "O que a garantia não cobre?",
    answer:
      "As condições dependem do termo do fabricante e da legislação. Consulte as orientações de uso e conservação do seu modelo; não há uma regra única para todos os produtos.",
  },
  {
    category: "Garantia e devolução",
    question: "Posso desistir da compra depois de receber?",
    answer:
      "Nas compras realizadas fora do estabelecimento comercial, o Código de Defesa do Consumidor prevê direito de arrependimento em até 7 dias, contados da assinatura ou do recebimento. Fale com a loja para orientar a solicitação. Compras presenciais seguem as condições aplicáveis.",
  },
  {
    category: "Garantia e devolução",
    question: "Como aciono a garantia?",
    answer:
      "Entre em contato com a loja com a nota fiscal, identificação do produto e descrição do problema. Fotos podem ajudar na avaliação e no encaminhamento ao fabricante.",
  },
  {
    category: "Garantia e devolução",
    question: "Como cuidar do produto?",
    answer:
      "Siga as instruções do fabricante para limpeza, instalação e uso. Confira a compatibilidade da base e os limites de peso quando informados. Solicite o manual específico à loja se necessário.",
  },
  {
    category: "Conta e pedidos",
    question: "Preciso criar conta para fazer um pedido?",
    answer:
      "Para registrar e acompanhar pedidos pelo site, crie uma conta e confirme seu e-mail. Você também pode solicitar atendimento ou orçamento pelo WhatsApp.",
  },
  {
    category: "Conta e pedidos",
    question: "Como confirmo meu e-mail?",
    answer:
      "Após o cadastro, abra o e-mail de confirmação e confirme sua conta pelo link, válido por 24 horas. Confira a pasta de spam. Se necessário, solicite um novo link na página de confirmação.",
  },
  {
    category: "Conta e pedidos",
    question: "Como acompanho meu pedido?",
    answer:
      "Entre em Minha conta para consultar os pedidos e seus status. Um pedido registrado depende da confirmação da loja; o registro por si só não significa pagamento ou entrega confirmados.",
  },
  {
    category: "Conta e pedidos",
    question: "Esqueci minha senha, e agora?",
    answer:
      "Na página de acesso, escolha Esqueci minha senha e informe seu e-mail. O link de recuperação vale por 30 minutos. Após a troca, faça login com a nova senha.",
  },
  {
    category: "Conta e pedidos",
    question: "O que vocês fazem com meus dados?",
    answer:
      "Os dados do cadastro são utilizados para acesso à conta e atendimento dos pedidos. Consulte a Política de privacidade para conhecer as finalidades e solicitar atendimento sobre seus dados.",
  },
];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function Help() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const list = questions.filter(
    (q) =>
      (category === "Todos" || q.category === category) &&
      normalize(q.question + " " + q.answer).includes(normalize(query.trim())),
  );
  return (
    <div className="container inner-page help-page">
      <h1>Ajuda e perguntas frequentes</h1>
      <p>Informações sobre produtos, pagamentos, entrega e cadastro.</p>
      <div className="help-content">
        <label className="help-search">
          <Search size={19} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na ajuda"
            aria-label="Buscar na ajuda"
          />
        </label>
        <div className="help-categories" aria-label="Categorias de ajuda">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="help-questions">
          {list.map((q) => (
            <details key={category + query + q.question}>
              <summary>
                {q.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{q.answer}</p>
              {q.question === "Vocês têm cartão da loja e crediário?" && (
                <a
                  className="text-link"
                  href={whatsapp(
                    "Olá! Gostaria de saber sobre o cartão da loja e o crediário da VL Móveis.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar pelo WhatsApp <ArrowUpRight size={16} />
                </a>
              )}
            </details>
          ))}
        </div>
        {!list.length && (
          <p role="status">
            Nenhuma pergunta encontrada. Tente outra busca ou fale com a loja.
          </p>
        )}
        <p className="help-links">
          <Link href="/conta">Minha conta</Link> ·{" "}
          <Link href="/privacidade">Política de privacidade</Link> ·{" "}
          <a
            href={whatsapp("Olá! Preciso de atendimento da VL Móveis.")}
            target="_blank"
            rel="noreferrer"
          >
            Atendimento pelo WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
