import Link from "next/link";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { TIPOS_UTILIZADOR } from "@/lib/constants";
import { manutencaoRequisicoes } from "@/lib/requisicoes";
import { NovaRequisicaoForm } from "@/components/NovaRequisicaoForm";

export default async function NovaRequisicaoPage() {
  await exigirAdmin();
  await manutencaoRequisicoes();

  const { rows: leitores } = await pool.query(
    "SELECT id, nome, n_processo, tipo, turma FROM utilizadores WHERE tipo != 'admin' ORDER BY nome"
  );
  const { rows: livros } = await pool.query(
    `SELECT b.id, b.titulo, b.autor, (b.exemplares - (
       SELECT COUNT(*) FROM requisicoes r
       WHERE r.livro_id = b.id AND r.estado IN ('pre_requisitado', 'entregue')
     ))::int AS disponiveis
     FROM livros b WHERE b.so_consulta = 0 ORDER BY b.titulo`
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Nova requisição (balcão)</h1>
          <p className="text-suave text-sm">
            Para quando alguém vai diretamente à biblioteca buscar um livro. Fica logo registado como{" "}
            <strong>entregue</strong>, com o prazo a contar a partir de hoje.
          </p>
        </div>
        <Link href="/admin/requisicoes" className="text-sm rounded border border-linha px-3 py-1.5 hover:bg-brand-tenue">
          ← Requisições
        </Link>
      </div>

      <div className="rounded-lg border border-linha bg-superficie p-6">
        {leitores.length === 0 ? (
          <p className="text-suave">Ainda não há nenhum leitor registado.</p>
        ) : livros.length === 0 ? (
          <p className="text-suave">Não há livros requisitáveis no catálogo.</p>
        ) : (
          <NovaRequisicaoForm
            leitores={leitores.map((l) => ({
              id: l.id,
              rotulo: `Nº ${l.n_processo} — ${l.nome} (${TIPOS_UTILIZADOR[l.tipo]}${l.turma ? `, ${l.turma}` : ""})`,
            }))}
            livros={livros.map((b) => ({
              id: b.id,
              disponivel: b.disponiveis > 0,
              rotulo: `${b.titulo} — ${b.autor} (${
                b.disponiveis > 0 ? `${b.disponiveis} disponível(eis)` : "sem exemplares"
              })`,
            }))}
          />
        )}
      </div>
    </div>
  );
}
