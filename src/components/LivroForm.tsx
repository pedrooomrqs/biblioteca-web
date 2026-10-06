"use client";

import { useActionState } from "react";
import { guardarLivroAction } from "@/app/admin/livros/actions";
import type { EstadoFormulario } from "@/app/actions";
import { GENEROS_SUGERIDOS, PRAZOS } from "@/lib/constants";

export interface DadosLivro {
  id: number;
  titulo: string;
  autor: string;
  genero: string | null;
  isbn: string | null;
  descricao: string;
  prazo: string;
  exemplares: number;
  exemplares_consulta: number;
}

/** Formulário de adicionar (sem livro) ou editar (com livro). */
export function LivroForm({ livro }: { livro: DadosLivro | null }) {
  const [estado, formAction, pending] = useActionState<EstadoFormulario, FormData>(
    guardarLivroAction.bind(null, livro?.id ?? null),
    {}
  );
  // Depois de um erro, mostra o que a pessoa tinha escrito (e não os valores antigos do livro).
  const v = estado.valores ?? {};
  const campo = "w-full rounded border border-linha px-3 py-2 text-sm bg-superficie";
  const rotulo = "block text-sm font-medium mb-1";

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>}
      <div>
        <label htmlFor="titulo" className={rotulo}>Título</label>
        <input id="titulo" name="titulo" required maxLength={150} defaultValue={v.titulo ?? livro?.titulo ?? ""} className={campo} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="autor" className={rotulo}>Autor</label>
          <input id="autor" name="autor" required maxLength={100} defaultValue={v.autor ?? livro?.autor ?? ""} className={campo} />
        </div>
        <div>
          <label htmlFor="genero" className={rotulo}>Género (opcional)</label>
          <input id="genero" name="genero" maxLength={40} list="generos" placeholder="ex.: Romance" defaultValue={v.genero ?? livro?.genero ?? ""} className={campo} />
          <datalist id="generos">
            {GENEROS_SUGERIDOS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label htmlFor="isbn" className={rotulo}>ISBN (opcional)</label>
        <input id="isbn" name="isbn" maxLength={17} placeholder="978-0-306-40615-7" defaultValue={v.isbn ?? livro?.isbn ?? ""} className={campo} />
      </div>
      <div>
        <label htmlFor="descricao" className={rotulo}>Descrição</label>
        <textarea id="descricao" name="descricao" rows={4} maxLength={3000} defaultValue={v.descricao ?? livro?.descricao ?? ""} className={campo} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="exemplares" className={rotulo}>Para requisitar</label>
          <input id="exemplares" name="exemplares" type="number" min={0} max={999} required defaultValue={v.exemplares ?? livro?.exemplares ?? 1} className={campo} />
          <p className="text-suave text-xs mt-1">Podem ser levados para casa.</p>
        </div>
        <div>
          <label htmlFor="exemplares_consulta" className={rotulo}>Só para consulta</label>
          <input id="exemplares_consulta" name="exemplares_consulta" type="number" min={0} max={999} required defaultValue={v.exemplares_consulta ?? livro?.exemplares_consulta ?? 0} className={campo} />
          <p className="text-suave text-xs mt-1">Ficam sempre na biblioteca.</p>
        </div>
        <div>
          <label htmlFor="prazo" className={rotulo}>Prazo</label>
          <select id="prazo" name="prazo" key={v.prazo ?? "inicial"} defaultValue={v.prazo ?? livro?.prazo ?? "10d"} className={campo}>
            {Object.entries(PRAZOS).map(([chave, nome]) => (
              <option key={chave} value={chave}>{nome}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-suave text-xs">A capa do livro escolhe-se no site da biblioteca no computador.</p>
      <button type="submit" disabled={pending} className="rounded bg-brand text-white px-5 py-2.5 font-medium disabled:opacity-60">
        {pending ? "A guardar…" : livro ? "Guardar alterações" : "Adicionar ao catálogo"}
      </button>
    </form>
  );
}
