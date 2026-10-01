"use client";

import { useActionState } from "react";
import { avaliarAction, type EstadoFormulario } from "@/app/actions";

export function AvaliarForm({
  livroId,
  minhaNota,
  meuComentario,
}: {
  livroId: number;
  minhaNota: number | null;
  meuComentario: string | null;
}) {
  const acaoComLivro = avaliarAction.bind(null, livroId);
  const [estado, formAction, pending] = useActionState<EstadoFormulario, FormData>(
    acaoComLivro,
    {}
  );

  return (
    <form action={formAction} className="mb-6 pb-6 border-b border-linha">
      {estado.erro && (
        <div className="mb-2 rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>
      )}
      <label className="block text-sm font-medium mb-1">
        {minhaNota ? "A tua avaliação" : "Deixa a tua avaliação"}
      </label>
      <div className="flex gap-3 mb-2">
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n} className="flex items-center gap-1 text-sm cursor-pointer">
            <input type="radio" name="nota" value={n} defaultChecked={minhaNota === n} required />
            {"★".repeat(n)}
          </label>
        ))}
      </div>
      <textarea
        name="comentario"
        maxLength={500}
        rows={2}
        defaultValue={meuComentario ?? ""}
        placeholder="Comentário (opcional)"
        className="w-full rounded border border-linha px-3 py-2 text-sm mb-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand text-white px-4 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "A guardar…" : minhaNota ? "Atualizar avaliação" : "Enviar avaliação"}
      </button>
    </form>
  );
}
