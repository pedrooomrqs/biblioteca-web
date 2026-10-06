import { erro, json, opcoes, utilizadorDoPedido } from "@/lib/api";
import { cancelarRequisicao } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilizador = await utilizadorDoPedido(request);
  if (!utilizador) return erro("Tens de iniciar sessão.", 401);

  const requisicaoId = Number((await params).id);
  const cancelada = Number.isInteger(requisicaoId) && (await cancelarRequisicao(utilizador.id, requisicaoId));
  return cancelada
    ? json({ mensagem: "Pré-requisição cancelada." })
    : erro("Só é possível cancelar pré-requisições ainda não levantadas.", 409);
}
