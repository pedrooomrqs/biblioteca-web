"use client";

import { useActionState } from "react";
import { preRequisitarAction, type EstadoFormulario } from "@/app/actions";

export function PreRequisitarForm({ livroId, prazo }: { livroId: number; prazo: string }) {
  const [estado, formAction, pending] = useActionState<EstadoFormulario>(
    preRequisitarAction.bind(null, livroId),
    {}
  );

  return (
    <form action={formAction}>
      {estado.erro && <div className="mb-2 rounded bg-red-50 text-red-700 text-sm px-3 py-2">{estado.erro}</div>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand text-white px-5 py-2.5 font-medium hover:bg-brand-escura disabled:opacity-60"
      >
        {pending ? "A pré-requisitar…" : "Pré-requisitar este livro"}
      </button>
      <p className="text-suave text-xs mt-2">
        A Dona Cacilda deixa o livro de lado para ti. Levanta-o na biblioteca para começar o prazo de {prazo}.
      </p>
    </form>
  );
}
