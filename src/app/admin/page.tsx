import Link from "next/link";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { hoje, manutencaoRequisicoes } from "@/lib/requisicoes";

export default async function AdminPage() {
  const admin = await exigirAdmin();
  await manutencaoRequisicoes();

  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE estado = 'pre_requisitado')::int AS pre,
       COUNT(*) FILTER (WHERE estado = 'entregue')::int AS entregues,
       COUNT(*) FILTER (WHERE estado = 'entregue' AND data_limite < $1)::int AS atraso,
       COUNT(*) FILTER (WHERE multa_centimos > 0 AND multa_paga = 0)::int AS multas,
       COUNT(*) FILTER (WHERE estado IN ('devolvido', 'cancelado'))::int AS historico
     FROM requisicoes`,
    [hoje()]
  );
  const c = rows[0];
  const { rows: totais } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM livros)::int AS livros,
            (SELECT COUNT(*) FROM utilizadores WHERE tipo != 'admin')::int AS leitores`
  );
  const { rows: maisRequisitados } = await pool.query(
    `SELECT l.id, l.titulo, l.autor, COUNT(r.id)::int AS total
     FROM livros l JOIN requisicoes r ON r.livro_id = l.id
     WHERE r.estado IN ('entregue', 'devolvido')
     GROUP BY l.id, l.titulo, l.autor ORDER BY total DESC, l.titulo LIMIT 5`
  );

  const cartoes: [string, string, number, boolean][] = [
    ["pre", "Pré-requisitadas", c.pre, false],
    ["entregues", "Entregues", c.entregues, false],
    ["atraso", "Em atraso", c.atraso, c.atraso > 0],
    ["multas", "Multas por pagar", c.multas, c.multas > 0],
    ["historico", "Histórico", c.historico, false],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-suave text-sm">
            Olá, {admin.nome}. {totais[0].livros} livros · {totais[0].leitores} leitores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/nova-requisicao" className="rounded bg-brand text-white px-4 py-2 text-sm font-medium">
            + Nova requisição (balcão)
          </Link>
          <Link href="/admin/livros" className="rounded border border-linha bg-superficie px-4 py-2 text-sm font-medium">
            Gerir livros
          </Link>
        </div>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-suave mb-2">Requisições</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {cartoes.map(([aba, nome, numero, alerta]) => (
          <Link
            key={aba}
            href={`/admin/requisicoes?aba=${aba}`}
            className={`rounded-lg border bg-superficie p-4 hover:shadow-md transition-shadow ${
              alerta ? "border-red-300" : "border-linha"
            }`}
          >
            <div className={`text-3xl font-bold ${alerta ? "text-red-700" : ""}`}>{numero}</div>
            <div className="text-sm text-suave">{nome}</div>
          </Link>
        ))}
      </div>

      {maisRequisitados.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-suave mb-2">Livros mais requisitados</h2>
          <div className="rounded-lg border border-linha bg-superficie divide-y divide-linha mb-8">
            {maisRequisitados.map((m, i) => (
              <Link key={m.id} href={`/livro/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-tenue">
                <span className="text-suave text-sm w-6">{i + 1}º</span>
                <span className="flex-1">
                  <span className="font-semibold">{m.titulo}</span>
                  <span className="block text-suave text-sm">{m.autor}</span>
                </span>
                <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-1">
                  {m.total} {m.total === 1 ? "requisição" : "requisições"}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="text-suave text-sm">
        Para escolher capas, gerir utilizadores e ver os avisos, usa o site da biblioteca no computador.
      </p>
    </div>
  );
}
