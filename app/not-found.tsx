import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="container empty-state">
      <h1>Não encontramos este cantinho.</h1>
      <p>Vamos voltar e encontrar o que você procura?</p>
      <Link href="/catalogo" className="button">
        Explorar produtos
      </Link>
    </main>
  );
}
