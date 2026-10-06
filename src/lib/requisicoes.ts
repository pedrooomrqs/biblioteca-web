import { pool } from "./db";
import { MULTA_CENTIMOS, PRAZO_LEVANTAMENTO_DIAS } from "./constants";
import type { Requisicao } from "./types";

/** Data de hoje em Portugal, "AAAA-MM-DD" (o servidor do Vercel corre em UTC). */
export function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

/** Data limite a partir da entrega e do prazo do livro. Meses de calendário:
 *  31 de janeiro + 1 mês = 28 ou 29 de fevereiro (igual ao site PHP). */
export function dataLimitePara(inicio: string, prazo: string): string {
  const [ano, mes, dia] = inicio.split("-").map(Number);
  if (prazo === "2d" || prazo === "10d") {
    const dt = new Date(Date.UTC(ano, mes - 1, dia + (prazo === "2d" ? 2 : 10)));
    return dt.toISOString().slice(0, 10);
  }
  if (prazo !== "1m" && prazo !== "6m") throw new Error(`Prazo desconhecido: ${prazo}`);
  const indice = mes - 1 + (prazo === "1m" ? 1 : 6);
  const anoFim = ano + Math.floor(indice / 12);
  const mesFim = indice % 12;
  const ultimoDia = new Date(Date.UTC(anoFim, mesFim + 1, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${anoFim}-${p(mesFim + 1)}-${p(Math.min(dia, ultimoDia))}`;
}

/** Aplica a multa fixa aos atrasos e cancela pré-requisições não levantadas. Seguro repetir. */
export async function manutencaoRequisicoes(): Promise<void> {
  await pool.query(
    "UPDATE requisicoes SET multa_centimos = $1 WHERE estado = 'entregue' AND data_limite < $2 AND multa_centimos = 0",
    [MULTA_CENTIMOS, hoje()]
  );
  await pool.query(
    "UPDATE requisicoes SET estado = 'cancelado' WHERE estado = 'pre_requisitado' AND pedida_em < (NOW() - make_interval(days => $1))",
    [PRAZO_LEVANTAMENTO_DIAS]
  );
}

export function euros(centimos: number): string {
  return (centimos / 100).toFixed(2).replace(".", ",") + "€";
}

export function dataPt(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** [texto, classes Tailwind] do distintivo de estado de uma requisição. */
export function estadoVisual(r: Pick<Requisicao, "estado" | "data_limite">): [string, string] {
  if (r.estado === "entregue" && !!r.data_limite && r.data_limite < hoje()) {
    return ["Em atraso", "bg-red-100 text-red-800"];
  }
  switch (r.estado) {
    case "pre_requisitado":
      return ["Pré-requisitado", "bg-sky-100 text-sky-800"];
    case "entregue":
      return ["Entregue", "bg-amber-100 text-amber-800"];
    case "devolvido":
      return ["Devolvido", "bg-green-100 text-green-800"];
    default:
      return ["Cancelado", "bg-gray-200 text-gray-700"];
  }
}
