"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { utilizadorAtual } from "@/lib/auth";
import { autenticar, avaliar, cancelarRequisicao, preRequisitar, registar } from "@/lib/servico";
import { valoresDoFormulario } from "@/lib/formularios";

export interface EstadoFormulario {
  erro?: string;
  /** O que a pessoa tinha escrito, para o formulário não ficar vazio depois de um erro. */
  valores?: Record<string, string>;
}

async function ipDoPedido(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "desconhecido").split(",")[0].trim();
}

export async function entrarAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const next = String(formData.get("next") ?? "") || "/";
  const resultado = await autenticar(
    String(formData.get("identificador") ?? ""),
    String(formData.get("palavra_passe") ?? ""),
    await ipDoPedido()
  );
  if ("erro" in resultado) return resultado;

  const session = await getSession();
  session.utilizadorId = resultado.id;
  await session.save();
  // Só caminhos internos, para nunca redirecionar para um site externo.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function sairAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

export async function registarAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const resultado = await registar(Object.fromEntries(formData));
  if ("erro" in resultado) {
    return { erro: resultado.erro, valores: valoresDoFormulario(formData, ["palavra_passe", "palavra_passe2"]) };
  }

  const session = await getSession();
  session.utilizadorId = resultado.id;
  await session.save();
  redirect("/");
}

export async function preRequisitarAction(
  livroId: number,
  _estado: EstadoFormulario
): Promise<EstadoFormulario> {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect(`/entrar?next=/livro/${livroId}`);

  const { ok, mensagem } = await preRequisitar(utilizador.id, livroId);
  revalidatePath(`/livro/${livroId}`);
  revalidatePath("/minhas-requisicoes");
  return ok ? {} : { erro: mensagem };
}

export async function cancelarRequisicaoAction(requisicaoId: number) {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect("/entrar");
  await cancelarRequisicao(utilizador.id, requisicaoId);
  revalidatePath("/minhas-requisicoes");
}

export async function avaliarAction(
  livroId: number,
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const utilizador = await utilizadorAtual();
  if (!utilizador) redirect(`/entrar?next=/livro/${livroId}`);

  const erro = await avaliar(
    utilizador.id,
    livroId,
    Number(formData.get("nota")),
    String(formData.get("comentario") ?? "").trim()
  );
  if (erro) return { erro };
  revalidatePath(`/livro/${livroId}`);
  return {};
}
