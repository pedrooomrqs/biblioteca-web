import Link from "next/link";
import { notFound } from "next/navigation";
import { PRAZOS, MULTA_CENTIMOS, capaUrl } from "@/lib/constants";
import { utilizadorAtual } from "@/lib/auth";
import { dataPt, euros } from "@/lib/requisicoes";
import { detalheLivro } from "@/lib/servico";
import { AvaliarForm } from "@/components/AvaliarForm";
import { PreRequisitarForm } from "@/components/PreRequisitarForm";

export default async function LivroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const livroId = Number(id);
  if (!Number.isInteger(livroId)) notFound();

  const utilizador = await utilizadorAtual();
  const detalhe = await detalheLivro(livroId, utilizador?.id ?? null);
  if (!detalhe) notFound();
  const { livro, disponiveis, avaliacoes, media, minhaRequisicao } = detalhe;
  const minhaAvaliacao = utilizador ? avaliacoes.find((a) => a.utilizador_id === utilizador.id) : null;

  return (
    <div>
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Voltar ao catálogo
      </Link>

      <div className="mt-4 rounded-lg border border-linha bg-superficie p-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-48 shrink-0">
          {livro.capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capaUrl(livro.capa)}
              alt={`Capa de ${livro.titulo}`}
              className="w-full aspect-[2/3] object-cover rounded border border-linha"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-brand-tenue rounded border border-linha flex items-center justify-center text-4xl">
              📖
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{livro.titulo}</h1>
          <p className="text-suave text-lg mt-1">{livro.autor}</p>
          {media !== null ? (
            <p className="text-amber-600 mt-1">
              ★ <strong>{media}</strong>{" "}
              <span className="text-suave text-sm">
                ({avaliacoes.length} avaliaç{avaliacoes.length === 1 ? "ão" : "ões"})
              </span>
            </p>
          ) : (
            <p className="text-suave text-sm mt-1">Ainda sem avaliações</p>
          )}
          {livro.isbn && <p className="text-suave text-sm mt-1">ISBN {livro.isbn}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            {livro.so_consulta ? (
              <span className="text-xs rounded-full bg-sky-100 text-sky-800 px-2 py-1">Só para consulta</span>
            ) : (
              <>
                {disponiveis > 0 ? (
                  <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-1">
                    {disponiveis} {disponiveis === 1 ? "disponível" : "disponíveis"}
                  </span>
                ) : (
                  <span className="text-xs rounded-full bg-gray-200 text-gray-700 px-2 py-1">
                    Sem exemplares disponíveis
                  </span>
                )}
                <span className="text-xs rounded-full bg-gray-100 text-suave px-2 py-1">
                  Prazo: {PRAZOS[livro.prazo]}
                </span>
                <span className="text-xs rounded-full bg-gray-100 text-suave px-2 py-1">
                  Multa por atraso: {euros(MULTA_CENTIMOS)}
                </span>
                {livro.exemplares_consulta > 0 && (
                  <span className="text-xs rounded-full bg-sky-100 text-sky-800 px-2 py-1">
                    {livro.exemplares_consulta} só para consulta
                  </span>
                )}
              </>
            )}
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm">
            {livro.descricao || <span className="italic text-suave">Sem descrição.</span>}
          </p>

          <div className="mt-5">
            {livro.so_consulta ? (
              <div className="rounded bg-sky-50 text-sky-800 text-sm px-4 py-3">
                Este livro é só para consulta: podes lê-lo na biblioteca, mas não pode ser levado para casa.
              </div>
            ) : minhaRequisicao ? (
              <div className="rounded bg-sky-50 text-sky-800 text-sm px-4 py-3">
                {minhaRequisicao.estado === "pre_requisitado" ? (
                  "Já pré-requisitaste este livro. A Dona Cacilda está a guardá-lo para ti."
                ) : (
                  <>
                    Tens este livro requisitado. Devolve até{" "}
                    <strong>{dataPt(minhaRequisicao.data_limite)}</strong>.
                  </>
                )}{" "}
                <Link href="/minhas-requisicoes" className="underline">
                  Ver as minhas requisições
                </Link>
              </div>
            ) : disponiveis > 0 ? (
              utilizador ? (
                <PreRequisitarForm livroId={livro.id} prazo={PRAZOS[livro.prazo]} />
              ) : (
                <Link
                  href={`/entrar?next=/livro/${livro.id}`}
                  className="inline-block rounded bg-brand text-white px-5 py-2.5 font-medium hover:bg-brand-escura"
                >
                  Entra para pré-requisitar
                </Link>
              )
            ) : (
              <div className="rounded bg-gray-100 text-suave text-sm px-4 py-3">
                Todos os exemplares para requisitar estão ocupados neste momento. Volta a tentar mais tarde.
              </div>
            )}
            {/* Livro com as duas coisas: além de requisitar, também se pode ler na biblioteca. */}
            {!livro.so_consulta && livro.exemplares_consulta > 0 && (
              <div className="mt-3 rounded bg-sky-50 text-sky-800 text-sm px-4 py-3">
                {livro.exemplares_consulta === 1
                  ? "Há também 1 exemplar"
                  : `Há também ${livro.exemplares_consulta} exemplares`}{" "}
                só para consulta: podes ler este livro na biblioteca sem o requisitar.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-linha bg-superficie p-6">
        <h2 className="text-lg font-bold mb-4">Avaliações</h2>

        {utilizador ? (
          <AvaliarForm
            livroId={livro.id}
            minhaNota={minhaAvaliacao?.nota ?? null}
            meuComentario={minhaAvaliacao?.comentario ?? null}
          />
        ) : (
          <p className="text-suave text-sm mb-6">
            <Link href={`/entrar?next=/livro/${livro.id}`} className="text-brand hover:underline">
              Entra
            </Link>{" "}
            para avaliares este livro.
          </p>
        )}

        {avaliacoes.length === 0 ? (
          <p className="text-suave">Ainda não há avaliações para este livro.</p>
        ) : (
          avaliacoes.map((a) => (
            <div key={a.id} className="mb-3 pb-3 border-b border-linha last:border-0">
              <div className="text-amber-600">
                {"★".repeat(a.nota)}
                <span className="text-gray-300">{"★".repeat(5 - a.nota)}</span>
              </div>
              <div className="text-sm font-semibold">
                {a.utilizador_nome}{" "}
                <span className="text-suave font-normal">· {dataPt(a.atualizada_em)}</span>
              </div>
              {a.comentario && <p className="text-sm mt-1">{a.comentario}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
