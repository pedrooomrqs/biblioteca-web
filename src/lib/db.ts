import { Pool, types } from "pg";

// Por omissão, o driver "pg" converte DATE/TIMESTAMP em objetos Date do JS.
// Aqui tratamos as datas sempre como texto "AAAA-MM-DD" (tal como o PDO do
// PHP já fazia), por isso desligamos essa conversão automática.
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp sem fuso horário
types.setTypeParser(1184, (v) => v); // timestamp com fuso horário

// Liga à mesma base de dados Postgres (Supabase) que o site PHP usa.
// Em desenvolvimento reaproveita-se o Pool entre recarregamentos (hot reload).
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}
