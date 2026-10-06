export const PRAZOS: Record<string, string> = {
  "2d": "2 dias",
  "10d": "10 dias",
  "1m": "1 mês",
  "6m": "6 meses",
};

export const TIPOS_UTILIZADOR: Record<string, string> = {
  aluno: "Aluno",
  professor: "Professor",
  funcionario: "Funcionário",
  admin: "Administradora",
};

// Géneros sugeridos no formulário do livro (pode escrever-se outro).
export const GENEROS_SUGERIDOS = [
  "Romance", "Fantasia", "Ficção científica", "Policial", "Poesia", "Teatro",
  "Contos", "Infantil", "Manga", "Banda desenhada", "História", "Ciência", "Biografia",
];

export const TIPOS_REGISTAVEIS = ["aluno", "professor", "funcionario"] as const;

// As capas estão num bucket público do Supabase Storage (o endereço não é segredo).
const CAPAS_BASE_URL = "https://eqtzgydqclteidwoeakq.supabase.co/storage/v1/object/public/capas";

export function capaUrl(nome: string): string {
  return `${CAPAS_BASE_URL}/${encodeURIComponent(nome)}`;
}

export const MULTA_CENTIMOS = 200;
export const PRAZO_LEVANTAMENTO_DIAS = 2;
