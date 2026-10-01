import { pool } from "./db";
import { getSession } from "./session";
import type { UtilizadorPublico } from "./types";

/** O utilizador com sessão iniciada (ou null). Nunca inclui a password_hash. */
export async function utilizadorAtual(): Promise<UtilizadorPublico | null> {
  const session = await getSession();
  if (!session.utilizadorId) return null;
  const { rows } = await pool.query<UtilizadorPublico>(
    "SELECT id, tipo, nome, email, n_processo, turma FROM utilizadores WHERE id = $1",
    [session.utilizadorId]
  );
  return rows[0] ?? null;
}
