import Link from "next/link";
import { PRAZOS, capaUrl } from "@/lib/constants";
import { listarLivros } from "@/lib/servico";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; disponibilidade?: string; prazo?: string; ordem?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const disponibilidade = sp.disponibilidade ?? "";
  const prazoFiltro = sp.prazo ?? "";
  const ordem = sp.ordem ?? "titulo";

  const livros = await listarLivros({ q, disponibilidade, prazo: prazoFiltro, ordem });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Catálogo da biblioteca</h1>
        <p className="text-suave text-sm">
          Procura um livro, vê os detalhes e pré-requisita-o online. Levantas depois na biblioteca.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Procurar por título, autor, género ou ISBN"
          className="flex-1 min-w-[200px] rounded border border-linha px-3 py-2 text-sm"
        />
        <select name="disponibilidade" defaultValue={disponibilidade} className="rounded border border-linha px-3 py-2 text-sm">
          <option value="">Todos os livros</option>
          <option value="disponivel">Só disponíveis</option>
          <option value="so_consulta">Só consulta</option>
        </select>
        <select name="prazo" defaultValue={prazoFiltro} className="rounded border border-linha px-3 py-2 text-sm">
          <option value="">Qualquer prazo</option>
          {Object.entries(PRAZOS).map(([chave, nome]) => (
            <option key={chave} value={chave}>
              {nome}
            </option>
          ))}
        </select>
        <select name="ordem" defaultValue={ordem} className="rounded border border-linha px-3 py-2 text-sm">
          <option value="titulo">Ordenar: Título</option>
          <option value="autor">Ordenar: Autor</option>
          <option value="avaliacao">Ordenar: Melhor avaliados</option>
          <option value="recente">Ordenar: Mais recentes</option>
        </select>
        <button type="submit" className="rounded bg-brand text-white px-4 py-2 text-sm font-medium">
          Procurar
        </button>
      </form>

      {livros.length === 0 ? (
        <p className="text-suave">Nenhum livro encontrado.</p>
      ) : (
        <>
          <p className="text-suave text-sm mb-3">
            {livros.length} livro{livros.length === 1 ? "" : "s"} no catálogo
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {livros.map((livro) => (
              <Link
                key={livro.id}
                href={`/livro/${livro.id}`}
                className="rounded-lg border border-linha bg-superficie overflow-hidden hover:shadow-md transition-shadow"
              >
                {livro.capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capaUrl(livro.capa)}
                    alt={`Capa de ${livro.titulo}`}
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-brand-tenue flex items-center justify-center text-3xl">
                    📖
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{livro.titulo}</h3>
                  <p className="text-suave text-xs mt-1">
                    {livro.autor}
                    {livro.genero ? ` · ${livro.genero}` : ""}
                  </p>
                  {livro.media_nota ? (
                    <p className="text-xs mt-1 text-amber-600">
                      ★ {livro.media_nota} <span className="text-suave">({livro.total_avaliacoes})</span>
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-suave">Sem avaliações</p>
                  )}
                  <div className="mt-2">
                    {livro.so_consulta ? (
                      <span className="inline-block text-xs rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">
                        Só consulta
                      </span>
                    ) : (livro.disponiveis ?? 0) > 0 ? (
                      <span className="inline-block text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">
                        Disponível
                      </span>
                    ) : (
                      <span className="inline-block text-xs rounded-full bg-gray-200 text-gray-700 px-2 py-0.5">
                        Sem exemplares
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
