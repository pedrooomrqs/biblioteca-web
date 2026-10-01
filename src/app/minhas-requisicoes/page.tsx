import { redirect } from "next/navigation";
import Link from "next/link";
import { pool } from "@/lib/db";
import { utilizadorAtual } from "@/lib/auth";
import { PRAZOS, MULTA_CENTIMOS } from "@/lib/constants";
import { cancelarRequisicaoAction } from "../actions";
import type { Requisicao } from "@/lib/types";

function euros(centimos: number): string {
  return (centimos / 100).toFixed(2).replace(".", ",") + "€";
}

function dataPt(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function estadoVisual(r: Requisicao): [string, string] {
  const emAtraso = r.estado === "entregue" && !!r.data_limite && r.data_limite < new Date().toISOString().slice(0, 10);
  if (emAtraso) return ["Em atraso", "bg-red-100 text-red-800"];
  switch (r.estado) {
    case "pre_requisitado":
      return ["Pré-requisitado", "bg-sky-100 text-sky-800"];
    case "entregue":
      return ["Entregue", "bg-amber-100 text-amber-800"];
    case "devolvido":
      return ["Devolvido", "bg-green-100 text-green-800"];
    default:
      return ["Cancelado", "bg-gray-200 text-gray-700"];
  }
}

export default async function MinhasRequisicoesPage() {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect("/entrar?next=/minhas-requisicoes");

  // Aplica multas e cancela pré-requisições paradas há mais de 2 dias, tal como o site PHP.
  await pool.query(
    "UPDATE requisicoes SET multa_centimos = $1 WHERE estado = 'entregue' AND data_limite < CURRENT_DATE AND multa_centimos = 0",
    [MULTA_CENTIMOS]
  );
  await pool.query(
    "UPDATE requisicoes SET estado = 'cancelado' WHERE estado = 'pre_requisitado' AND pedida_em < (NOW() - make_interval(days => 2))"
  );

  const { rows: requisicoes } = await pool.query<Requisicao>(
    `SELECT r.*, l.titulo, l.autor, l.capa, l.prazo FROM requisicoes r
     JOIN livros l ON l.id = r.livro_id
     WHERE r.utilizador_id = $1 ORDER BY r.id DESC`,
    [utilizador.id]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">As minhas requisições</h1>

      {requisicoes.length === 0 ? (
        <p className="text-suave">
          Ainda não requisitaste nenhum livro.{" "}
          <Link href="/" className="text-brand hover:underline">
            Ver o catálogo
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {requisicoes.map((r) => {
            const [texto, cor] = estadoVisual(r);
            return (
              <div key={r.id} className="rounded-lg border border-linha bg-superficie p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[160px]">
                  <Link href={`/livro/${r.livro_id}`} className="font-semibold hover:underline">
                    {r.titulo}
                  </Link>
                  <p className="text-suave text-sm">{r.autor}</p>
                </div>
                <span className={`text-xs rounded-full px-2 py-1 ${cor}`}>{texto}</span>
                <div className="text-sm text-suave">
                  {r.entregue_em && (
                    <p>
                      Prazo: <strong>{dataPt(r.data_limite)}</strong>
                    </p>
                  )}
                  {r.multa_centimos > 0 && (
                    <p>
                      Multa: {euros(r.multa_centimos)} {r.multa_paga ? "(paga)" : "(por pagar)"}
                    </p>
                  )}
                </div>
                {r.estado === "pre_requisitado" && (
                  <form action={cancelarRequisicaoAction.bind(null, r.id)}>
                    <button type="submit" className="text-sm rounded border border-linha px-3 py-1.5 hover:bg-gray-50">
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
