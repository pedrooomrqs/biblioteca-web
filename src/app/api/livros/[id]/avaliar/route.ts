import { corpoJson, erro, json, opcoes, utilizadorDoPedido } from "@/lib/api";
import { avaliar } from "@/lib/servico";

export const OPTIONS = opcoes;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilizador = await utilizadorDoPedido(request);
  if (!utilizador) return erro("Tens de iniciar sessão.", 401);

  const livroId = Number((await params).id);
  if (!Number.isInteger(livroId)) return erro("Livro não encontrado.", 404);

  const corpo = await corpoJson(request);
  const mensagem = await avaliar(
    utilizador.id,
    livroId,
    Number(corpo.nota),
    String(corpo.comentario ?? "").trim()
  );
  return mensagem ? erro(mensagem) : json({ mensagem: "Avaliação guardada. Obrigado!" });
}
