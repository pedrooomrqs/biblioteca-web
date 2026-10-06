import { erro, json, livroParaApi, opcoes, utilizadorDoPedido } from "@/lib/api";
import { detalheLivro } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const livroId = Number((await params).id);
  if (!Number.isInteger(livroId)) return erro("Livro não encontrado.", 404);

  const utilizador = await utilizadorDoPedido(request);
  const detalhe = await detalheLivro(livroId, utilizador?.id ?? null);
  if (!detalhe) return erro("Livro não encontrado.", 404);

  const minha = utilizador ? detalhe.avaliacoes.find((a) => a.utilizador_id === utilizador.id) : null;
  return json({
    ...livroParaApi(detalhe.livro),
    media_nota: detalhe.media,
    total_avaliacoes: detalhe.avaliacoes.length,
    avaliacoes: detalhe.avaliacoes.map((a) => ({
      nome: a.utilizador_nome,
      nota: a.nota,
      comentario: a.comentario,
      data: a.atualizada_em.slice(0, 10),
    })),
    minha_avaliacao: minha ? { nota: minha.nota, comentario: minha.comentario } : null,
    minha_requisicao: detalhe.minhaRequisicao
      ? { estado: detalhe.minhaRequisicao.estado, data_limite: detalhe.minhaRequisicao.data_limite }
      : null,
  });
}
