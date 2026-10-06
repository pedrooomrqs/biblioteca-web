import { corpoJson, criarToken, erro, json, opcoes, utilizadorPublico } from "@/lib/api";
import { registar } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function POST(request: Request) {
  const resultado = await registar(await corpoJson(request));
  if ("erro" in resultado) return erro(resultado.erro);

  return json(
    { token: await criarToken(resultado.id), utilizador: await utilizadorPublico(resultado.id) },
    201
  );
}
