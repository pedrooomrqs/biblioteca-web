"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrarAction, type EstadoFormulario } from "@/app/actions";

export function EntrarForm({ next }: { next: string }) {
  const [estado, formAction, pending] = useActionState<EstadoFormulario, FormData>(entrarAction, {});

  return (
    <div className="max-w-sm mx-auto rounded-lg border border-linha bg-superficie p-6">
      <h1 className="text-xl font-bold mb-4">Entrar</h1>
      {estado.erro && (
        <div className="mb-3 rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>
      )}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm font-medium mb-1">Email ou Nº de processo</label>
          <input
            type="text"
            name="identificador"
            required
            autoFocus
            className="w-full rounded border border-linha px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Palavra-passe</label>
          <input
            type="password"
            name="palavra_passe"
            required
            className="w-full rounded border border-linha px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-brand text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          {pending ? "A entrar…" : "Entrar"}
        </button>
      </form>
      <p className="text-suave text-sm mt-4">
        Ainda não tens conta?{" "}
        <Link href="/registo" className="text-brand hover:underline">
          Criar conta
        </Link>
        .
      </p>
    </div>
  );
}
