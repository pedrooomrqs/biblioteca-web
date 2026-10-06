// Utilitários da API JSON (/api/...) usada pela app móvel em Flutter.
import { sealData, unsealData } from "iron-session";
import { pool } from "./db";
import { capaUrl } from "./constants";
import type { Livro, UtilizadorPublico } from "./types";

const TOKEN_DIAS = 30;

// A app (incluindo a versão web de testes, que corre noutro endereço) autentica-se com um
// token no cabeçalho Authorization e nunca com cookies, por isso permitir qualquer origem é seguro.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function json(dados: unknown, status = 200): Response {
  return Response.json(dados, { status, headers: CORS });
}

export function erro(mensagem: string, status = 400): Response {
  return json({ erro: mensagem }, status);
}

/** Resposta aos pedidos "preflight" que o browser faz antes de um POST com JSON. */
export function opcoes(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function criarToken(utilizadorId: number): Promise<string> {
  return sealData(
    { utilizadorId },
    { password: process.env.SESSION_SECRET as string, ttl: TOKEN_DIAS * 24 * 60 * 60 }
  );
}

/** O utilizador dono do token enviado em "Authorization: Bearer ...", ou null. */
export async function utilizadorDoPedido(request: Request): Promise<UtilizadorPublico | null> {
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.toLowerCase().startsWith("bearer ")) return null;
  let utilizadorId: unknown;
  try {
    const dados = await unsealData<{ utilizadorId?: number }>(cabecalho.slice(7).trim(), {
      password: process.env.SESSION_SECRET as string,
      ttl: TOKEN_DIAS * 24 * 60 * 60,
    });
    utilizadorId = dados.utilizadorId;
  } catch {
    return null;
  }
  if (typeof utilizadorId !== "number") return null;
  return utilizadorPublico(utilizadorId);
}

export async function utilizadorPublico(id: number): Promise<UtilizadorPublico | null> {
  const { rows } = await pool.query<UtilizadorPublico>(
    "SELECT id, tipo, nome, email, n_processo, turma FROM utilizadores WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export function ipDoPedido(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "desconhecido").split(",")[0].trim();
}

/** Corpo JSON do pedido como objeto (vazio se vier inválido). */
export async function corpoJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await request.json();
    return corpo && typeof corpo === "object" && !Array.isArray(corpo) ? corpo : {};
  } catch {
    return {};
  }
}

/** Livro tal como a app o recebe: com o endereço completo da capa e a média como número. */
export function livroParaApi(livro: Livro) {
  return {
    id: livro.id,
    titulo: livro.titulo,
    autor: livro.autor,
    genero: livro.genero,
    isbn: livro.isbn,
    descricao: livro.descricao,
    capa_url: livro.capa ? capaUrl(livro.capa) : null,
    prazo: livro.prazo,
    so_consulta: livro.so_consulta === 1,
    exemplares: livro.exemplares,
    exemplares_consulta: livro.exemplares_consulta,
    disponiveis: livro.disponiveis ?? 0,
    media_nota: livro.media_nota ? Number(livro.media_nota) : null,
    total_avaliacoes: livro.total_avaliacoes ?? 0,
  };
}
