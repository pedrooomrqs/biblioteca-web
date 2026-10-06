import { erro, json, opcoes, utilizadorDoPedido } from "@/lib/api";

export const OPTIONS = opcoes;

/** Quem sou eu? Serve para a app confirmar, ao abrir, se o token guardado ainda é válido. */
export async function GET(request: Request) {
  const utilizador = await utilizadorDoPedido(request);
  return utilizador ? json(utilizador) : erro("Sessão inválida ou expirada.", 401);
}
