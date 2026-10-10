"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="container empty-state">
      <h1>A loja precisa de um instante.</h1>
      <p>Não conseguimos carregar esta página. Tente novamente.</p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
