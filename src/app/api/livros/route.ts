import { json, livroParaApi, opcoes } from "@/lib/api";
import { listarLivros } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const livros = await listarLivros({
    q: sp.get("q") ?? "",
    disponibilidade: sp.get("disponibilidade") ?? "",
    prazo: sp.get("prazo") ?? "",
    ordem: sp.get("ordem") ?? "titulo",
  });
  return json(livros.map(livroParaApi));
}
