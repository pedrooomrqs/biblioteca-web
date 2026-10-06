"use client";

import { useActionState } from "react";
import { requisicaoBalcaoAction } from "@/app/admin/actions";
import type { EstadoFormulario } from "@/app/actions";

export interface OpcaoLeitor {
  id: number;
  rotulo: string;
}

export interface OpcaoLivro {
  id: number;
  rotulo: string;
  disponivel: boolean;
}

export function NovaRequisicaoForm({ leitores, livros }: { leitores: OpcaoLeitor[]; livros: OpcaoLivro[] }) {
  const [estado, formAction, pending] = useActionState<EstadoFormulario, FormData>(requisicaoBalcaoAction, {});
  const campo = "w-full rounded border border-linha px-3 py-2 text-sm bg-superficie";

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>}
      <div>
        <label htmlFor="utilizador_id" className="block text-sm font-medium mb-1">
          Leitor
        </label>
        <select id="utilizador_id" name="utilizador_id" required defaultValue="" className={campo}>
          <option value="">— escolhe o nº de processo ou nome —</option>
          {leitores.map((l) => (
            <option key={l.id} value={l.id}>
              {l.rotulo}
            </option>
          ))}
        </select>
        <p className="text-suave text-xs mt-1">
          Pede o nº de processo (ou o nome) à pessoa para confirmares que é a conta certa.
        </p>
      </div>
      <div>
        <label htmlFor="livro_id" className="block text-sm font-medium mb-1">
          Livro
        </label>
        <select id="livro_id" name="livro_id" required defaultValue="" className={campo}>
          <option value="">— escolhe o livro —</option>
          {livros.map((b) => (
            <option key={b.id} value={b.id} disabled={!b.disponivel}>
              {b.rotulo}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand text-white px-5 py-2.5 font-medium disabled:opacity-60"
      >
        {pending ? "A registar…" : "Registar requisição"}
      </button>
    </form>
  );
}
