/**
 * Os campos de texto de um formulário submetido, para os devolver ao ecrã junto com o erro.
 * Sem isto, o React esvazia o formulário depois de cada submissão e a pessoa perde o que escreveu.
 * As chaves começadas por "$" são internas do React; `excluir` serve para as palavras-passe.
 */
export function valoresDoFormulario(formData: FormData, excluir: string[] = []): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string" && !chave.startsWith("$") && !excluir.includes(chave)) {
      valores[chave] = valor;
    }
  }
  return valores;
}
