import { erro, json, opcoes, utilizadorDoPedido } from "@/lib/api";
import { capaUrl } from "@/lib/constants";
import { hoje, manutencaoRequisicoes } from "@/lib/requisicoes";
import { requisicoesDoUtilizador } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function GET(request: Request) {
  const utilizador = await utilizadorDoPedido(request);
  if (!utilizador) return erro("Tens de iniciar sessão.", 401);

  await manutencaoRequisicoes();
  const requisicoes = await requisicoesDoUtilizador(utilizador.id);
  const dataHoje = hoje();
  return json(
    requisicoes.map((r) => ({
      id: r.id,
      livro_id: r.livro_id,
      titulo: r.titulo,
      autor: r.autor,
      capa_url: r.capa ? capaUrl(r.capa) : null,
      estado: r.estado,
      em_atraso: r.estado === "entregue" && !!r.data_limite && r.data_limite < dataHoje,
      pedida_em: r.pedida_em.slice(0, 10),
      entregue_em: r.entregue_em,
      data_limite: r.data_limite,
      devolvida_em: r.devolvida_em,
      multa_centimos: r.multa_centimos,
      multa_paga: r.multa_paga === 1,
    }))
  );
}
