"use client";

import { useActionState } from "react";
import { registarAction, type EstadoFormulario } from "@/app/actions";
import { TIPOS_REGISTAVEIS, TIPOS_UTILIZADOR } from "@/lib/constants";

export function RegistoForm() {
  const [estado, formAction, pending] = useActionState<EstadoFormulario, FormData>(registarAction, {});

  return (
    <div className="max-w-lg mx-auto rounded-lg border border-linha bg-superficie p-6">
      <h1 className="text-xl font-bold mb-4">Criar conta</h1>
      {estado.erro && (
        <div className="mb-3 rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>
      )}
      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Eu sou</label>
          <select name="tipo" required className="w-full rounded border border-linha px-3 py-2 text-sm">
            <option value="">— escolhe —</option>
            {TIPOS_REGISTAVEIS.map((t) => (
              <option key={t} value={t}>
                {TIPOS_UTILIZADOR[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nº de processo</label>
            <input name="n_processo" required maxLength={10} className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Turma</label>
            <input name="turma" maxLength={30} placeholder="9.º ao 12.º, ex.: 9.º B" className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome completo</label>
          <input name="nome" required maxLength={100} className="w-full rounded border border-linha px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Data de nascimento</label>
            <input type="date" name="data_nascimento" required className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telemóvel</label>
            <input name="telemovel" required placeholder="912345678" className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Morada</label>
          <input name="morada" required maxLength={200} className="w-full rounded border border-linha px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Código postal</label>
          <input name="codigo_postal" required placeholder="0000-000" className="w-full rounded border border-linha px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" name="email" required maxLength={120} className="w-full rounded border border-linha px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Palavra-passe</label>
            <input type="password" name="palavra_passe" required minLength={8} className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Repetir palavra-passe</label>
            <input type="password" name="palavra_passe2" required minLength={8} className="w-full rounded border border-linha px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs text-suave">
          <input type="checkbox" name="consentimento" required className="mt-0.5" />
          <span>
            Li e aceito que os meus dados pessoais sejam guardados e usados apenas pela biblioteca da escola, para
            gerir requisições de livros.
          </span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-brand text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          {pending ? "A criar conta…" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
