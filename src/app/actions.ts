"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { utilizadorAtual } from "@/lib/auth";
import { TIPOS_REGISTAVEIS } from "@/lib/constants";

export interface EstadoFormulario {
  erro?: string;
}

export async function entrarAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const identificador = String(formData.get("identificador") ?? "").trim();
  const palavraPasse = String(formData.get("palavra_passe") ?? "");
  const next = String(formData.get("next") ?? "") || "/";

  const { rows } = await pool.query(
    "SELECT * FROM utilizadores WHERE email = $1 OR n_processo = $2",
    [identificador.toLowerCase(), identificador]
  );
  const conta = rows[0];

  if (!conta || !bcrypt.compareSync(palavraPasse, conta.password_hash)) {
    return { erro: "Email / Nº de processo ou palavra-passe incorretos." };
  }

  const session = await getSession();
  session.utilizadorId = conta.id;
  await session.save();
  redirect(next.startsWith("/") ? next : "/");
}

export async function sairAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

export async function registarAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const tipo = String(formData.get("tipo") ?? "");
  const n_processo = String(formData.get("n_processo") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const turma = String(formData.get("turma") ?? "").trim();
  const data_nascimento = String(formData.get("data_nascimento") ?? "");
  const morada = String(formData.get("morada") ?? "").trim();
  const codigoPostalBruto = String(formData.get("codigo_postal") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telemovelBruto = String(formData.get("telemovel") ?? "").replace(/[\s-]/g, "");
  const palavraPasse = String(formData.get("palavra_passe") ?? "");
  const palavraPasse2 = String(formData.get("palavra_passe2") ?? "");
  const consentimento = formData.get("consentimento");

  if (!(TIPOS_REGISTAVEIS as readonly string[]).includes(tipo)) {
    return { erro: "Escolhe se és aluno, professor ou funcionário." };
  }
  if (!/^\d{1,10}$/.test(n_processo)) {
    return { erro: "O Nº de processo tem de ter apenas dígitos." };
  }
  if (nome.length < 2 || nome.length > 100) {
    return { erro: "Indica o teu nome completo." };
  }
  if ((tipo === "aluno" || tipo === "professor") && turma === "") {
    return { erro: "Indica a turma." };
  }
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data_nascimento);
  const hoje = new Date().toISOString().slice(0, 10);
  if (!dataValida || data_nascimento < "1900-01-01" || data_nascimento >= hoje) {
    return { erro: "Data de nascimento inválida." };
  }
  if (morada.length < 5 || morada.length > 200) {
    return { erro: "Indica a morada." };
  }
  const m = codigoPostalBruto.match(/^(\d{4})-?(\d{3})$/);
  const codigoPostal = m ? `${m[1]}-${m[2]}` : codigoPostalBruto;
  if (!/^\d{4}-\d{3}$/.test(codigoPostal)) {
    return { erro: "O código postal tem de ter o formato 0000-000." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return { erro: "Email inválido." };
  }
  const telMatch = telemovelBruto.match(/^(?:\+351|00351)?(\d{9})$/);
  if (!telMatch) {
    return { erro: "Telemóvel inválido (9 dígitos, ex.: 912345678)." };
  }
  const telemovel = "+351" + telMatch[1];
  if (palavraPasse.length < 8 || palavraPasse.length > 128) {
    return { erro: "A palavra-passe tem de ter pelo menos 8 caracteres." };
  }
  if (palavraPasse !== palavraPasse2) {
    return { erro: "As palavras-passe não coincidem." };
  }
  if (!consentimento) {
    return { erro: "Tens de aceitar os termos sobre o tratamento dos teus dados pessoais." };
  }

  const hash = bcrypt.hashSync(palavraPasse, 10);
  let novoId: number;
  try {
    const { rows } = await pool.query(
      `INSERT INTO utilizadores
        (tipo, n_processo, nome, turma, data_nascimento, morada, codigo_postal, email, telemovel, password_hash, consentimento_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
      [tipo, n_processo, nome, turma || null, data_nascimento, morada, codigoPostal, email, telemovel, hash]
    );
    novoId = rows[0].id;
  } catch (exc: unknown) {
    const code = (exc as { code?: string }).code;
    if (code === "23505") {
      return { erro: "Já existe uma conta com esse email ou Nº de processo." };
    }
    throw exc;
  }

  const session = await getSession();
  session.utilizadorId = novoId;
  await session.save();
  redirect("/");
}

export async function preRequisitarAction(livroId: number) {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect(`/entrar?next=/livro/${livroId}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: livroRows } = await client.query(
      "SELECT * FROM livros WHERE id = $1 FOR UPDATE",
      [livroId]
    );
    const livro = livroRows[0];
    if (!livro || livro.so_consulta) {
      await client.query("ROLLBACK");
      return;
    }
    const { rows: existentes } = await client.query(
      `SELECT 1 FROM requisicoes WHERE utilizador_id = $1 AND livro_id = $2
       AND estado IN ('pre_requisitado', 'entregue')`,
      [utilizador!.id, livroId]
    );
    if (existentes.length) {
      await client.query("ROLLBACK");
      return;
    }
    const { rows: disp } = await client.query(
      `SELECT (b.exemplares - (
         SELECT COUNT(*) FROM requisicoes r
         WHERE r.livro_id = b.id AND r.estado IN ('pre_requisitado', 'entregue')
       ))::int AS disponiveis FROM livros b WHERE b.id = $1`,
      [livroId]
    );
    if ((disp[0]?.disponiveis ?? 0) <= 0) {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(
      "INSERT INTO requisicoes (utilizador_id, livro_id, estado) VALUES ($1, $2, 'pre_requisitado')",
      [utilizador!.id, livroId]
    );
    await client.query("COMMIT");
  } catch (exc) {
    await client.query("ROLLBACK");
    throw exc;
  } finally {
    client.release();
  }
  revalidatePath(`/livro/${livroId}`);
  revalidatePath("/minhas-requisicoes");
}

export async function cancelarRequisicaoAction(requisicaoId: number) {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect("/entrar");
  await pool.query(
    "UPDATE requisicoes SET estado = 'cancelado' WHERE id = $1 AND estado = 'pre_requisitado' AND utilizador_id = $2",
    [requisicaoId, utilizador!.id]
  );
  revalidatePath("/minhas-requisicoes");
}

export async function avaliarAction(
  livroId: number,
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect(`/entrar?next=/livro/${livroId}`);

  const nota = Number(formData.get("nota"));
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return { erro: "Escolhe uma nota de 1 a 5 estrelas." };
  }
  if (comentario.length > 500) {
    return { erro: "O comentário é demasiado longo (máx. 500 caracteres)." };
  }

  await pool.query(
    `INSERT INTO avaliacoes (utilizador_id, livro_id, nota, comentario)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (utilizador_id, livro_id)
     DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, atualizada_em = NOW()`,
    [utilizador!.id, livroId, nota, comentario || null]
  );
  revalidatePath(`/livro/${livroId}`);
  return {};
}
