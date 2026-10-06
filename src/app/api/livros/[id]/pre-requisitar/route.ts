import { erro, json, opcoes, utilizadorDoPedido } from "@/lib/api";
import { preRequisitar } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilizador = await utilizadorDoPedido(request);
  if (!utilizador) return erro("Tens de iniciar sessão.", 401);

  const livroId = Number((await params).id);
  if (!Number.isInteger(livroId)) return erro("Livro não encontrado.", 404);

  const { ok, mensagem } = await preRequisitar(utilizador.id, livroId);
  return ok ? json({ mensagem }) : erro(mensagem, 409);
}
