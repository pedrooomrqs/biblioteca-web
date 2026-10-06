import Link from "next/link";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { PRAZOS, TIPOS_UTILIZADOR } from "@/lib/constants";
import { dataPt, estadoVisual, euros, hoje, manutencaoRequisicoes } from "@/lib/requisicoes";
import { cancelarAdminAction, devolverAction, entregarAction, multaPagaAction } from "../actions";

// [nome da aba, condição SQL]. "$hoje" é trocado por um parâmetro com a data de hoje.
const ABAS: Record<string, [string, string]> = {
  pre: ["Pré-requisitadas", "r.estado = 'pre_requisitado'"],
  entregues: ["Entregues", "r.estado = 'entregue'"],
  atraso: ["Em atraso", "r.estado = 'entregue' AND r.data_limite < $hoje"],
  multas: ["Multas por pagar", "r.multa_centimos > 0 AND r.multa_paga = 0"],
  historico: ["Histórico", "r.estado IN ('devolvido', 'cancelado')"],
};

const botao = "text-sm rounded border border-linha px-3 py-1.5 hover:bg-brand-tenue";
const botaoPrincipal = "text-sm rounded bg-brand text-white px-3 py-1.5 hover:bg-brand-escura";

export default async function AdminRequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; q?: string }>;
}) {
  await exigirAdmin();
  await manutencaoRequisicoes();

  const sp = await searchParams;
  const aba = sp.aba && ABAS[sp.aba] ? sp.aba : "pre";
  const q = (sp.q ?? "").trim();

  const params: unknown[] = [];
  let condicao = ABAS[aba][1];
  if (condicao.includes("$hoje")) {
    params.push(hoje());
    condicao = condicao.replace("$hoje", `$${params.length}`);
  }
  let filtro = "";
  if (q !== "") {
    params.push(`%${q}%`);
    const n = params.length;
    filtro = ` AND (u.nome ILIKE $${n} OR u.n_processo ILIKE $${n} OR l.titulo ILIKE $${n})`;
  }
  const { rows: linhas } = await pool.query(
    `SELECT r.*, l.titulo, l.prazo, u.nome AS utilizador_nome, u.tipo AS utilizador_tipo, u.turma, u.n_processo
     FROM requisicoes r
     JOIN livros l ON l.id = r.livro_id
     JOIN utilizadores u ON u.id = r.utilizador_id
     WHERE ${condicao}${filtro}
     ORDER BY r.id DESC LIMIT 300`,
    params
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Requisições</h1>
        <div className="flex gap-2">
          <Link href="/admin/nova-requisicao" className={botaoPrincipal}>
            + Nova requisição (balcão)
          </Link>
          <Link href="/admin" className={botao}>
            ← Painel
          </Link>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-4">
        {Object.entries(ABAS).map(([chave, [nome]]) => (
          <Link
            key={chave}
            href={`/admin/requisicoes?aba=${chave}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`text-sm rounded-full px-3 py-1.5 ${
              chave === aba ? "bg-brand text-white" : "border border-linha bg-superficie hover:bg-brand-tenue"
            }`}
          >
            {nome}
          </Link>
        ))}
      </nav>

      <form method="get" className="flex gap-2 mb-4 max-w-md">
        <input type="hidden" name="aba" value={aba} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nome, Nº de processo ou livro"
          className="flex-1 rounded border border-linha px-3 py-2 text-sm bg-superficie"
        />
        <button type="submit" className={botaoPrincipal}>
          Procurar
        </button>
      </form>

      {linhas.length === 0 ? (
        <p className="text-suave">Nada para mostrar aqui.</p>
      ) : (
        <div className="space-y-3">
          {linhas.map((r) => {
            const [texto, cor] = estadoVisual(r);
            return (
              <div key={r.id} className="rounded-lg border border-linha bg-superficie p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[180px]">
                  <Link href={`/livro/${r.livro_id}`} className="font-semibold hover:underline">
                    {r.titulo}
                  </Link>
                  <p className="text-sm">{r.utilizador_nome}</p>
                  <p className="text-suave text-xs">
                    {TIPOS_UTILIZADOR[r.utilizador_tipo]}
                    {r.turma ? ` · ${r.turma}` : ""} · Nº {r.n_processo} · prazo de {PRAZOS[r.prazo]}
                  </p>
                </div>
                <span className={`text-xs rounded-full px-2 py-1 ${cor}`}>{texto}</span>
                <div className="text-xs text-suave min-w-[130px]">
                  <p>Pedida: {dataPt(r.pedida_em)}</p>
                  {r.entregue_em && (
                    <p>
                      Prazo: <strong>{dataPt(r.data_limite)}</strong>
                    </p>
                  )}
                  {r.devolvida_em && <p>Devolvido: {dataPt(r.devolvida_em)}</p>}
                  {r.multa_centimos > 0 && (
                    <p className={r.multa_paga ? "" : "text-red-700 font-semibold"}>
                      Multa {euros(r.multa_centimos)} {r.multa_paga ? "(paga)" : "(por pagar)"}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.estado === "pre_requisitado" && (
                    <>
                      <form action={entregarAction.bind(null, r.id)}>
                        <button type="submit" className={botaoPrincipal}>
                          Entregar
                        </button>
                      </form>
                      <form action={cancelarAdminAction.bind(null, r.id)}>
                        <button type="submit" className={botao}>
                          Cancelar
                        </button>
                      </form>
                    </>
                  )}
                  {r.estado === "entregue" && (
                    <form action={devolverAction.bind(null, r.id)}>
                      <button type="submit" className={botaoPrincipal}>
                        Devolvido
                      </button>
                    </form>
                  )}
                  {r.multa_centimos > 0 && (
                    <form action={multaPagaAction.bind(null, r.id, !r.multa_paga)}>
                      <button type="submit" className={botao}>
                        {r.multa_paga ? "Marcar por pagar" : "Multa paga"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
