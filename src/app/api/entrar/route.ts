import { corpoJson, criarToken, erro, ipDoPedido, json, opcoes, utilizadorPublico } from "@/lib/api";
import { autenticar } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function POST(request: Request) {
  const corpo = await corpoJson(request);
  const resultado = await autenticar(
    String(corpo.identificador ?? ""),
    String(corpo.palavra_passe ?? ""),
    ipDoPedido(request)
  );
  if ("erro" in resultado) return erro(resultado.erro, 401);

  return json({
    token: await criarToken(resultado.id),
    utilizador: await utilizadorPublico(resultado.id),
  });
}
