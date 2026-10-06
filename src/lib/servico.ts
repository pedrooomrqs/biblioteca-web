// Regras de negócio partilhadas pelo site (Server Actions) e pela API usada pela app móvel.
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { PRAZOS, TIPOS_REGISTAVEIS } from "./constants";
import type { Avaliacao, Livro, Requisicao } from "./types";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 10;

/** Verifica as credenciais; bloqueia durante uns minutos após várias falhas seguidas. */
export async function autenticar(
  identificador: string,
  palavraPasse: string,
  ip: string
): Promise<{ id: number } | { erro: string }> {
  const ident = identificador.trim().slice(0, 120);
  const { rows: tentativas } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM tentativas_login
     WHERE ip = $1 AND email = $2 AND criada_em > (NOW() - make_interval(mins => $3))`,
    [ip, ident.toLowerCase(), JANELA_MINUTOS]
  );
  if (tentativas[0].n >= MAX_TENTATIVAS) {
    return { erro: `Demasiadas tentativas falhadas. Espera ${JANELA_MINUTOS} minutos e tenta de novo.` };
  }

  const { rows } = await pool.query(
    "SELECT id, password_hash FROM utilizadores WHERE email = $1 OR n_processo = $2",
    [ident.toLowerCase(), ident]
  );
  const conta = rows[0];
  if (!conta || !bcrypt.compareSync(palavraPasse, conta.password_hash)) {
    await pool.query("INSERT INTO tentativas_login (ip, email) VALUES ($1, $2)", [ip, ident.toLowerCase()]);
    return { erro: "Email / Nº de processo ou palavra-passe incorretos." };
  }
  return { id: conta.id };
}

/** Valida e cria uma conta nova. Os campos chegam como texto (formulário ou JSON). */
export async function registar(
  campos: Record<string, unknown>
): Promise<{ id: number } | { erro: string }> {
  const texto = (chave: string) => String(campos[chave] ?? "").trim();
  const tipo = texto("tipo");
  const n_processo = texto("n_processo");
  const nome = texto("nome").replace(/\s+/g, " ");
  const turma = texto("turma");
  const data_nascimento = texto("data_nascimento");
  const morada = texto("morada");
  const email = texto("email").toLowerCase();
  const palavraPasse = String(campos.palavra_passe ?? "");
  const palavraPasse2 = String(campos.palavra_passe2 ?? "");

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
  // A escola só tem do 9.º ao 12.º ano: a turma de um aluno tem de começar por 9, 10, 11 ou 12.
  if (tipo === "aluno" && !/^(9|1[0-2])(?!\d)/.test(turma)) {
    return { erro: "A escola só tem do 9.º ao 12.º ano. Indica uma turma como 9.º B ou 12.º N." };
  }
  if (turma.length > 30) {
    return { erro: "A turma é demasiado longa." };
  }
  const dataReal = new Date(`${data_nascimento}T00:00:00Z`);
  const hojeIso = new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento) ||
    Number.isNaN(dataReal.getTime()) ||
    dataReal.toISOString().slice(0, 10) !== data_nascimento ||
    data_nascimento < "1900-01-01" ||
    data_nascimento >= hojeIso
  ) {
    return { erro: "Data de nascimento inválida." };
  }
  if (morada.length < 5 || morada.length > 200) {
    return { erro: "Indica a morada." };
  }
  const cp = texto("codigo_postal").match(/^(\d{4})-?(\d{3})$/);
  if (!cp) {
    return { erro: "O código postal tem de ter o formato 0000-000." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return { erro: "Email inválido." };
  }
  const tel = texto("telemovel").replace(/[\s-]/g, "").match(/^(?:\+351|00351)?(\d{9})$/);
  if (!tel) {
    return { erro: "Telemóvel inválido (9 dígitos, ex.: 912345678)." };
  }
  if (palavraPasse.length < 8 || palavraPasse.length > 128) {
    return { erro: "A palavra-passe tem de ter pelo menos 8 caracteres." };
  }
  if (palavraPasse !== palavraPasse2) {
    return { erro: "As palavras-passe não coincidem." };
  }
  if (!campos.consentimento) {
    return { erro: "Tens de aceitar os termos sobre o tratamento dos teus dados pessoais." };
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO utilizadores
        (tipo, n_processo, nome, turma, data_nascimento, morada, codigo_postal, email, telemovel, password_hash, consentimento_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
      [
        tipo,
        n_processo,
        nome,
        turma || null,
        data_nascimento,
        morada,
        `${cp[1]}-${cp[2]}`,
        email,
        "+351" + tel[1],
        bcrypt.hashSync(palavraPasse, 10),
      ]
    );
    return { id: rows[0].id };
  } catch (exc: unknown) {
    if ((exc as { code?: string }).code === "23505") {
      return { erro: "Já existe uma conta com esse email ou Nº de processo." };
    }
    throw exc;
  }
}

export interface FiltrosCatalogo {
  q?: string;
  disponibilidade?: string;
  prazo?: string;
  ordem?: string;
}

const SQL_DISPONIVEIS = `(b.exemplares - (
  SELECT COUNT(*) FROM requisicoes r
  WHERE r.livro_id = b.id AND r.estado IN ('pre_requisitado', 'entregue')
))::int`;

export async function listarLivros(filtros: FiltrosCatalogo): Promise<Livro[]> {
  const q = (filtros.q ?? "").trim();
  const condicoes: string[] = [];
  const params: unknown[] = [];

  if (q !== "") {
    params.push(`%${q}%`, `%${q.replace(/[\s-]/g, "")}%`);
    condicoes.push(`(b.titulo ILIKE $1 OR b.autor ILIKE $1 OR b.genero ILIKE $1 OR b.isbn ILIKE $2)`);
  }
  if (filtros.disponibilidade === "disponivel") {
    condicoes.push(`b.so_consulta = 0 AND ${SQL_DISPONIVEIS} > 0`);
  } else if (filtros.disponibilidade === "so_consulta") {
    condicoes.push("b.so_consulta = 1");
  }
  if (filtros.prazo && Object.prototype.hasOwnProperty.call(PRAZOS, filtros.prazo)) {
    params.push(filtros.prazo);
    condicoes.push(`b.prazo = $${params.length}`);
  }

  const ordens: Record<string, string> = {
    titulo: "b.titulo",
    autor: "b.autor, b.titulo",
    avaliacao: "media_nota DESC NULLS LAST, b.titulo",
    recente: "b.criado_em DESC",
  };
  const ordemSql = ordens[filtros.ordem ?? "titulo"] ?? ordens.titulo;
  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  const { rows } = await pool.query<Livro>(
    `SELECT b.*, ${SQL_DISPONIVEIS} AS disponiveis,
       (SELECT ROUND(AVG(a.nota), 1) FROM avaliacoes a WHERE a.livro_id = b.id) AS media_nota,
       (SELECT COUNT(*) FROM avaliacoes a WHERE a.livro_id = b.id)::int AS total_avaliacoes
     FROM livros b ${where} ORDER BY ${ordemSql}`,
    params
  );
  return rows;
}

export interface DetalheLivro {
  livro: Livro;
  disponiveis: number;
  avaliacoes: Avaliacao[];
  media: number | null;
  minhaRequisicao: Requisicao | null;
}

export async function detalheLivro(livroId: number, utilizadorId: number | null): Promise<DetalheLivro | null> {
  const { rows: livros } = await pool.query<Livro>(
    `SELECT b.*, ${SQL_DISPONIVEIS} AS disponiveis FROM livros b WHERE b.id = $1`,
    [livroId]
  );
  const livro = livros[0];
  if (!livro) return null;

  let minhaRequisicao: Requisicao | null = null;
  if (utilizadorId !== null) {
    const { rows } = await pool.query<Requisicao>(
      `SELECT * FROM requisicoes WHERE utilizador_id = $1 AND livro_id = $2
       AND estado IN ('pre_requisitado', 'entregue') ORDER BY id DESC LIMIT 1`,
      [utilizadorId, livroId]
    );
    minhaRequisicao = rows[0] ?? null;
  }

  const { rows: avaliacoes } = await pool.query<Avaliacao>(
    `SELECT a.*, u.nome AS utilizador_nome FROM avaliacoes a
     JOIN utilizadores u ON u.id = a.utilizador_id
     WHERE a.livro_id = $1 ORDER BY a.atualizada_em DESC`,
    [livroId]
  );
  const media = avaliacoes.length
    ? Math.round((avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length) * 10) / 10
    : null;

  return { livro, disponiveis: livro.disponiveis ?? 0, avaliacoes, media, minhaRequisicao };
}

export async function preRequisitar(
  utilizadorId: number,
  livroId: number
): Promise<{ ok: boolean; mensagem: string }> {
  const client = await pool.connect();
  let erro: string | null = null;
  try {
    await client.query("BEGIN");
    // FOR UPDATE: duas pessoas não conseguem reservar o último exemplar ao mesmo tempo.
    const { rows: livros } = await client.query("SELECT * FROM livros WHERE id = $1 FOR UPDATE", [livroId]);
    const livro = livros[0];
    if (!livro) {
      erro = "Livro não encontrado.";
    } else if (livro.so_consulta) {
      erro = "Este livro é só para consulta na biblioteca e não pode ser requisitado.";
    } else {
      const { rows: ativas } = await client.query(
        `SELECT 1 FROM requisicoes WHERE utilizador_id = $1 AND livro_id = $2
         AND estado IN ('pre_requisitado', 'entregue')`,
        [utilizadorId, livroId]
      );
      const { rows: emUso } = await client.query(
        "SELECT COUNT(*)::int AS n FROM requisicoes WHERE livro_id = $1 AND estado IN ('pre_requisitado', 'entregue')",
        [livroId]
      );
      if (ativas[0]) {
        erro = "Já tens este livro pré-requisitado ou requisitado.";
      } else if (livro.exemplares - emUso[0].n <= 0) {
        erro = "Não há exemplares disponíveis neste momento.";
      } else {
        await client.query(
          "INSERT INTO requisicoes (utilizador_id, livro_id, estado) VALUES ($1, $2, 'pre_requisitado')",
          [utilizadorId, livroId]
        );
      }
    }
    await client.query(erro ? "ROLLBACK" : "COMMIT");
  } catch (exc) {
    await client.query("ROLLBACK");
    throw exc;
  } finally {
    client.release();
  }
  return erro
    ? { ok: false, mensagem: erro }
    : { ok: true, mensagem: "Livro pré-requisitado! A Dona Cacilda vai guardá-lo para ti." };
}

/** Só cancela pré-requisições do próprio utilizador. */
export async function cancelarRequisicao(utilizadorId: number, requisicaoId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    "UPDATE requisicoes SET estado = 'cancelado' WHERE id = $1 AND estado = 'pre_requisitado' AND utilizador_id = $2",
    [requisicaoId, utilizadorId]
  );
  return rowCount === 1;
}

/** Grava ou atualiza a avaliação. Devolve a mensagem de erro, ou null se correu bem. */
export async function avaliar(
  utilizadorId: number,
  livroId: number,
  nota: number,
  comentario: string
): Promise<string | null> {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return "Escolhe uma nota de 1 a 5 estrelas.";
  }
  if (comentario.length > 500) {
    return "O comentário é demasiado longo (máx. 500 caracteres).";
  }
  const { rows } = await pool.query("SELECT 1 FROM livros WHERE id = $1", [livroId]);
  if (!rows[0]) {
    return "Livro não encontrado.";
  }
  await pool.query(
    `INSERT INTO avaliacoes (utilizador_id, livro_id, nota, comentario)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (utilizador_id, livro_id)
     DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, atualizada_em = NOW()`,
    [utilizadorId, livroId, nota, comentario || null]
  );
  return null;
}

export async function requisicoesDoUtilizador(utilizadorId: number): Promise<Requisicao[]> {
  const { rows } = await pool.query<Requisicao>(
    `SELECT r.*, l.titulo, l.autor, l.capa, l.prazo FROM requisicoes r
     JOIN livros l ON l.id = r.livro_id
     WHERE r.utilizador_id = $1 ORDER BY r.id DESC`,
    [utilizadorId]
  );
  return rows;
}
