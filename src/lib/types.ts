export type TipoUtilizador = "aluno" | "professor" | "funcionario" | "admin";

export interface UtilizadorPublico {
  id: number;
  tipo: TipoUtilizador;
  nome: string;
  email: string;
  n_processo: string | null;
  turma: string | null;
}

export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  genero: string | null;
  isbn: string | null;
  descricao: string;
  capa: string | null;
  prazo: string;
  so_consulta: number;
  exemplares: number; // cópias que podem ser requisitadas
  exemplares_consulta: number; // cópias que ficam sempre na biblioteca
  criado_em: string;
  disponiveis?: number;
  media_nota?: string | null;
  total_avaliacoes?: number;
}

export type EstadoRequisicao = "pre_requisitado" | "entregue" | "devolvido" | "cancelado";

export interface Requisicao {
  id: number;
  utilizador_id: number;
  livro_id: number;
  estado: EstadoRequisicao;
  pedida_em: string;
  entregue_em: string | null;
  data_limite: string | null;
  devolvida_em: string | null;
  multa_centimos: number;
  multa_paga: number;
  titulo?: string;
  autor?: string;
  capa?: string | null;
  prazo?: string;
}

export interface Avaliacao {
  id: number;
  utilizador_id: number;
  livro_id: number;
  nota: number;
  comentario: string | null;
  criada_em: string;
  atualizada_em: string;
  utilizador_nome?: string;
}
