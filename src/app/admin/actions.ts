"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { MULTA_CENTIMOS } from "@/lib/constants";
import { dataLimitePara, hoje } from "@/lib/requisicoes";
import type { EstadoFormulario } from "../actions";

/** Pré-requisitado -> entregue; o prazo começa a contar hoje. */
export async function entregarAction(requisicaoId: number) {
  await exigirAdmin();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT r.id, l.prazo FROM requisicoes r JOIN livros l ON l.id = r.livro_id
       WHERE r.id = $1 AND r.estado = 'pre_requisitado' FOR UPDATE OF r`,
      [requisicaoId]
    );
    if (rows[0]) {
      const inicio = hoje();
      await client.query(
        "UPDATE requisicoes SET estado = 'entregue', entregue_em = $1, data_limite = $2 WHERE id = $3",
        [inicio, dataLimitePara(inicio, rows[0].prazo), requisicaoId]
      );
    }
    await client.query("COMMIT");
  } catch (exc) {
    await client.query("ROLLBACK");
    throw exc;
  } finally {
    client.release();
  }
  revalidatePath("/admin", "layout");
}

/** Entregue -> devolvido; aplica a multa se vier depois do prazo. */
export async function devolverAction(requisicaoId: number) {
  await exigirAdmin();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT data_limite, multa_centimos FROM requisicoes WHERE id = $1 AND estado = 'entregue' FOR UPDATE",
      [requisicaoId]
    );
    if (rows[0]) {
      const devolvidaEm = hoje();
      const multa =
        rows[0].multa_centimos > 0
          ? rows[0].multa_centimos
          : devolvidaEm > rows[0].data_limite
            ? MULTA_CENTIMOS
            : 0;
      await client.query(
        "UPDATE requisicoes SET estado = 'devolvido', devolvida_em = $1, multa_centimos = $2 WHERE id = $3",
        [devolvidaEm, multa, requisicaoId]
      );
    }
    await client.query("COMMIT");
  } catch (exc) {
    await client.query("ROLLBACK");
    throw exc;
  } finally {
    client.release();
  }
  revalidatePath("/admin", "layout");
}

export async function cancelarAdminAction(requisicaoId: number) {
  await exigirAdmin();
  await pool.query(
    "UPDATE requisicoes SET estado = 'cancelado' WHERE id = $1 AND estado = 'pre_requisitado'",
    [requisicaoId]
  );
  revalidatePath("/admin", "layout");
}

export async function multaPagaAction(requisicaoId: number, paga: boolean) {
  await exigirAdmin();
  await pool.query("UPDATE requisicoes SET multa_paga = $1 WHERE id = $2 AND multa_centimos > 0", [
    paga ? 1 : 0,
    requisicaoId,
  ]);
  revalidatePath("/admin", "layout");
}

/** Registo ao balcão: fica logo como "entregue", sem passar por pré-requisitado. */
export async function requisicaoBalcaoAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await exigirAdmin();
  const utilizadorId = Number(formData.get("utilizador_id"));
  const livroId = Number(formData.get("livro_id"));
  if (!Number.isInteger(utilizadorId) || utilizadorId <= 0 || !Number.isInteger(livroId) || livroId <= 0) {
    return { erro: "Escolhe o leitor e o livro." };
  }

  const client = await pool.connect();
  let erro: string | null = null;
  try {
    await client.query("BEGIN");
    const { rows: livros } = await client.query("SELECT * FROM livros WHERE id = $1 FOR UPDATE", [livroId]);
    const livro = livros[0];
    const { rows: leitores } = await client.query(
      "SELECT 1 FROM utilizadores WHERE id = $1 AND tipo != 'admin'",
      [utilizadorId]
    );
    if (!livro) {
      erro = "Livro não encontrado.";
    } else if (!leitores[0]) {
      erro = "Leitor não encontrado.";
    } else if (livro.so_consulta) {
      erro = "Este livro é só para consulta na biblioteca e não pode ser requisitado.";
    } else {
      const { rows: ativas } = await client.query(
        `SELECT 1 FROM requisicoes WHERE utilizador_id = $1 AND livro_id = $2
         AND estado IN ('pre_requisitado', 'entregue')`,
        [utilizadorId, livroId]
      );
      const { rows: emUso } = await client.query(
        "SELECT COUNT(*)::int AS n FROM requisicoes WHERE livro_id = $1 AND estado IN ('pre_requisitado', 'entregue')",
        [livroId]
      );
      if (ativas[0]) {
        erro = "Esta pessoa já tem este livro pré-requisitado ou requisitado.";
      } else if (livro.exemplares - emUso[0].n <= 0) {
        erro = "Não há exemplares disponíveis neste momento.";
      } else {
        const inicio = hoje();
        await client.query(
          `INSERT INTO requisicoes (utilizador_id, livro_id, estado, entregue_em, data_limite)
           VALUES ($1, $2, 'entregue', $3, $4)`,
          [utilizadorId, livroId, inicio, dataLimitePara(inicio, livro.prazo)]
        );
      }
    }
    await client.query(erro ? "ROLLBACK" : "COMMIT");
  } catch (exc) {
    await client.query("ROLLBACK");
    throw exc;
  } finally {
    client.release();
  }
  if (erro) return { erro };
  revalidatePath("/admin", "layout");
  redirect("/admin/requisicoes?aba=entregues");
}
