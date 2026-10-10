"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "./store-context";

export function AccountSecurity({ view }: { view: string }) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const verify = view === "confirmar-email",
    reset = view === "redefinir-senha";
  const token = params.get("token") || "";
  const title = verify
    ? "Confirmar meu e-mail"
    : reset
      ? "Criar nova senha"
      : view === "recuperar-senha"
        ? "Recuperar acesso"
        : "Reenviar confirmação";
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fields = new FormData(e.currentTarget);
    if (reset && fields.get("password") !== fields.get("passwordConfirm")) {
      setError("As senhas precisam ser iguais.");
      setBusy(false);
      return;
    }
    try {
      const route = verify
        ? "auth/verify"
        : reset
          ? "auth/reset-password"
          : view === "recuperar-senha"
            ? "auth/forgot-password"
            : "auth/resend";
      const result = await api(
        route,
        "POST",
        verify
          ? { token }
          : reset
            ? { token, password: fields.get("password") }
            : { email: fields.get("email") },
      );
      setMessage(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container verification-page">
      <h1>{title}</h1>
      {message ? (
        <div className="auth-notice" role="status">
          <p>{message}</p>
          <Link className="button" href="/conta">
            Ir para minha conta
          </Link>
        </div>
      ) : (
        <>
          <p>
            {verify
              ? "Clique no botão para confirmar o endereço informado no cadastro."
              : reset
                ? "Use uma senha exclusiva de pelo menos 12 caracteres."
                : "Informe o e-mail usado na sua conta."}
          </p>
          <form onSubmit={submit}>
            {!verify && !reset && (
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
            )}
            {reset && (
              <>
                <label>
                  Nova senha
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
                <label>
                  Confirmar nova senha
                  <input
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
              </>
            )}
            {(verify || reset) && !/^[a-f0-9]{64}$/.test(token) && (
              <p className="form-error">
                O link está incompleto. Abra o link recebido na mensagem.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button"
              disabled={
                busy || ((verify || reset) && !/^[a-f0-9]{64}$/.test(token))
              }
            >
              {busy
                ? "Aguarde…"
                : verify
                  ? "Confirmar e-mail"
                  : reset
                    ? "Salvar nova senha"
                    : "Enviar instruções"}
            </button>
          </form>
          <p>
            <Link className="text-link" href="/conta">
              Voltar para minha conta
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
