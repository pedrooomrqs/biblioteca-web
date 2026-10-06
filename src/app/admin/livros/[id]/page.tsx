import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { LivroForm, type DadosLivro } from "@/components/LivroForm";

/** /admin/livros/novo adiciona um livro; /admin/livros/<número> edita esse livro. */
export default async function AdminLivroPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;

  let livro: DadosLivro | null = null;
  if (id !== "novo") {
    const livroId = Number(id);
    if (!Number.isInteger(livroId)) notFound();
    const { rows } = await pool.query<DadosLivro>(
      `SELECT id, titulo, autor, genero, isbn, descricao, prazo, exemplares, exemplares_consulta
       FROM livros WHERE id = $1`,
      [livroId]
    );
    if (!rows[0]) notFound();
    livro = rows[0];
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{livro ? "Editar livro" : "Adicionar livro"}</h1>
        <Link href="/admin/livros" className="text-sm rounded border border-linha px-3 py-1.5 hover:bg-brand-tenue">
          ← Livros
        </Link>
      </div>
      <div className="rounded-lg border border-linha bg-superficie p-6">
        <LivroForm livro={livro} />
      </div>
    </div>
  );
}
