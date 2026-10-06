import Link from "next/link";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { PRAZOS } from "@/lib/constants";
import { apagarLivroAction } from "./actions";

export default async function AdminLivrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  await exigirAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const params: unknown[] = [];
  let filtro = "";
  if (q !== "") {
    params.push(`%${q}%`);
    filtro = "WHERE b.titulo ILIKE $1 OR b.autor ILIKE $1 OR b.genero ILIKE $1 OR b.isbn ILIKE $1";
  }
  const { rows: livros } = await pool.query(
    `SELECT b.*, (SELECT COUNT(*) FROM requisicoes r WHERE r.livro_id = b.id
                  AND r.estado IN ('pre_requisitado', 'entregue'))::int AS em_uso
     FROM livros b ${filtro} ORDER BY b.titulo`,
    params
  );
  const botao = "text-sm rounded border border-linha px-3 py-1.5 hover:bg-brand-tenue";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Livros</h1>
        <div className="flex gap-2">
          <Link href="/admin/livros/novo" className="text-sm rounded bg-brand text-white px-3 py-1.5">
            + Adicionar livro
          </Link>
          <Link href="/admin" className={botao}>
            ← Painel
          </Link>
        </div>
      </div>

      {sp.erro === "historico" && (
        <div className="mb-4 rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          Este livro tem requisições no histórico, por isso não pode ser apagado.
        </div>
      )}

      <form method="get" className="flex gap-2 mb-4 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Título, autor, género ou ISBN"
          className="flex-1 rounded border border-linha px-3 py-2 text-sm bg-superficie"
        />
        <button type="submit" className="text-sm rounded bg-brand text-white px-3 py-1.5">
          Procurar
        </button>
      </form>

      {livros.length === 0 ? (
        <p className="text-suave">Nenhum livro encontrado.</p>
      ) : (
        <div className="space-y-2">
          {livros.map((b) => (
            <div key={b.id} className="rounded-lg border border-linha bg-superficie p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Link href={`/livro/${b.id}`} className="font-semibold hover:underline">
                  {b.titulo}
                </Link>
                <p className="text-suave text-sm">
                  {b.autor}
                  {b.genero ? ` · ${b.genero}` : ""}
                </p>
              </div>
              <div className="text-sm min-w-[170px]">
                {b.exemplares > 0 && (
                  <p>
                    <strong>{b.exemplares}</strong> para requisitar{" "}
                    <span className="text-suave">
                      ({b.em_uso} em uso, {PRAZOS[b.prazo]})
                    </span>
                  </p>
                )}
                {b.exemplares_consulta > 0 && (
                  <p>
                    <strong>{b.exemplares_consulta}</strong> só consulta
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/livros/${b.id}`} className={botao}>
                  Editar
                </Link>
                <form action={apagarLivroAction.bind(null, b.id)}>
                  <button type="submit" className={`${botao} text-red-700`}>
                    Apagar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
