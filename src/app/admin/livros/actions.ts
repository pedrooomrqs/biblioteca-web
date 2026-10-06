"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { PRAZOS } from "@/lib/constants";
import { valoresDoFormulario } from "@/lib/formularios";
import type { EstadoFormulario } from "../../actions";

/** Tira hífenes/espaços e confirma o dígito de controlo (ISBN-10 ou ISBN-13). null = inválido. */
function normalizarIsbn(bruto: string): string | null {
  const isbn = bruto.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{13}$/.test(isbn)) {
    let soma = 0;
    for (let i = 0; i < 12; i++) soma += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (soma % 10)) % 10 === Number(isbn[12]) ? isbn : null;
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    let soma = 0;
    for (let i = 0; i < 10; i++) soma += (isbn[i] === "X" ? 10 : Number(isbn[i])) * (10 - i);
    return soma % 11 === 0 ? isbn : null;
  }
  return null;
}

/** Cria (livroId = null) ou atualiza um livro. A capa não se muda aqui: isso faz-se no site do PC. */
export async function guardarLivroAction(
  livroId: number | null,
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const resultado = await guardarLivro(livroId, formData);
  return resultado.erro ? { erro: resultado.erro, valores: valoresDoFormulario(formData) } : resultado;
}

async function guardarLivro(livroId: number | null, formData: FormData): Promise<EstadoFormulario> {
  const texto = (chave: string) => String(formData.get(chave) ?? "").trim().replace(/\s+/g, " ");
  const titulo = texto("titulo");
  const autor = texto("autor");
  const genero = texto("genero");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const prazo = texto("prazo");
  const exemplares = Number(formData.get("exemplares"));
  const exemplaresConsulta = Number(formData.get("exemplares_consulta"));

  if (titulo.length < 1 || titulo.length > 150) return { erro: "Indica o título (até 150 caracteres)." };
  if (autor.length < 1 || autor.length > 100) return { erro: "Indica o autor (até 100 caracteres)." };
  if (genero.length > 40) return { erro: "O género é demasiado longo (máx. 40 caracteres)." };
  if (descricao.length > 3000) return { erro: "A descrição é demasiado longa (máx. 3000 caracteres)." };
  if (!Object.prototype.hasOwnProperty.call(PRAZOS, prazo)) return { erro: "Escolhe o prazo de requisição." };
  for (const [n, nome] of [
    [exemplares, "para requisitar"],
    [exemplaresConsulta, "só para consulta"],
  ] as const) {
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      return { erro: `O número de exemplares ${nome} tem de estar entre 0 e 999.` };
    }
  }
  if (exemplares + exemplaresConsulta < 1) {
    return { erro: "O livro tem de ter pelo menos um exemplar (para requisitar ou para consulta)." };
  }

  let isbn: string | null = null;
  const isbnBruto = texto("isbn");
  if (isbnBruto !== "") {
    isbn = normalizarIsbn(isbnBruto);
    if (isbn === null) {
      return { erro: "ISBN inválido: tem de ter 10 ou 13 dígitos e o dígito de controlo certo." };
    }
    const { rows } = await pool.query("SELECT titulo FROM livros WHERE isbn = $1 AND id <> $2", [isbn, livroId ?? 0]);
    if (rows[0]) return { erro: `Já existe um livro com este ISBN: "${rows[0].titulo}".` };
  }

  if (livroId !== null) {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM requisicoes WHERE livro_id = $1 AND estado IN ('pre_requisitado', 'entregue')",
      [livroId]
    );
    if (exemplares < rows[0].n) {
      return {
        erro: `Há ${rows[0].n} exemplar(es) requisitado(s); os exemplares para requisitar não podem ser menos do que isso.`,
      };
    }
  }

  // "Só consulta" não é uma opção à parte: é um livro sem exemplares requisitáveis.
  const valores = [titulo, autor, genero || null, isbn, descricao, prazo, exemplares === 0 ? 1 : 0, exemplares, exemplaresConsulta];
  if (livroId === null) {
    await pool.query(
      `INSERT INTO livros (titulo, autor, genero, isbn, descricao, prazo, so_consulta, exemplares, exemplares_consulta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      valores
    );
  } else {
    await pool.query(
      `UPDATE livros SET titulo = $1, autor = $2, genero = $3, isbn = $4, descricao = $5, prazo = $6,
              so_consulta = $7, exemplares = $8, exemplares_consulta = $9 WHERE id = $10`,
      [...valores, livroId]
    );
  }
  revalidatePath("/", "layout");
  redirect("/admin/livros");
}

/** Apaga um livro. Se tiver requisições no histórico, a base de dados recusa e o livro fica. */
export async function apagarLivroAction(livroId: number) {
  await exigirAdmin();
  let ficou = false;
  try {
    await pool.query("DELETE FROM livros WHERE id = $1", [livroId]);
  } catch (exc: unknown) {
    if ((exc as { code?: string }).code !== "23503") throw exc; // 23503 = ainda há requisições deste livro
    ficou = true;
  }
  revalidatePath("/", "layout");
  redirect(ficou ? "/admin/livros?erro=historico" : "/admin/livros");
}
