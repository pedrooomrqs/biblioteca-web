# Biblioteca Escolar — site online (React)

Site da biblioteca do Agrupamento de Escolas Dr. Ginestal Machado, feito em React (Next.js)
e publicado no Vercel. É a Fase 3 do trabalho: a migração do site original em PHP + Bootstrap.

**Site publicado:** https://biblioteca-web-beta.vercel.app

## O que faz

Para alunos, professores e funcionários:

- Catálogo com pesquisa por título, autor, género ou ISBN, filtros e ordenação
- Página de cada livro: disponibilidade, prazo, exemplares só para consulta, avaliações
- Criar conta e iniciar sessão (email ou n.º de processo)
- Pré-requisitar um livro e cancelar a pré-requisição
- Ver as suas requisições, prazos e multas
- Avaliar livros com estrelas e comentário

Para a administração (Dona Cacilda), em `/admin`:

- Painel com contagens e os livros mais requisitados
- Requisições: entregar, receber devoluções, cancelar, marcar multas como pagas
- Registar uma requisição ao balcão
- Adicionar, editar e apagar livros

## Como se liga ao resto do trabalho

```
App móvel (Flutter)  ──►  API deste site (/api/...)  ──►  Supabase (PostgreSQL)
Site online (React)  ─────────────────────────────────►  Supabase (PostgreSQL)
Site do PC (PHP)     ─────────────────────────────────►  MySQL local (XAMPP)
```

O site online e a app móvel partilham a mesma base de dados no Supabase. Por isso, uma
reserva feita na app aparece logo em `/admin/requisicoes`, e quando a biblioteca a entrega
ou a dá como devolvida, o estado muda também na app.

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Interface | React 19 com Next.js (App Router) e Tailwind CSS |
| Base de dados | PostgreSQL no Supabase, acedida no servidor com `pg` |
| Sessões | Cookie cifrado (`iron-session`); a app móvel usa um token |
| Palavras-passe | `bcryptjs` (compatível com o `password_hash` do PHP) |
| Capas dos livros | Supabase Storage |
| Alojamento | Vercel (cada `git push` para `main` publica uma versão nova) |

## Estrutura do código

```
src/
  app/                 páginas (cada pasta é um endereço do site)
    page.tsx           catálogo
    livro/[id]/        página de um livro
    entrar/, registo/  sessão e criação de conta
    minhas-requisicoes/
    admin/             área da administração
    api/               API em JSON usada pela app móvel
    actions.ts         ações dos formulários (Server Actions)
  components/          formulários interativos
  lib/
    servico.ts         regras da biblioteca, partilhadas pelo site e pela API
    requisicoes.ts     prazos, multas e datas
    db.ts              ligação à base de dados
```

## API usada pela app móvel

| Método | Endereço | Para quê |
|---|---|---|
| GET | `/api/livros?q=&disponibilidade=&prazo=&ordem=` | catálogo |
| GET | `/api/livros/:id` | um livro e as suas avaliações |
| POST | `/api/entrar` | iniciar sessão (devolve um token) |
| POST | `/api/registo` | criar conta |
| GET | `/api/eu` | quem tem sessão iniciada |
| POST | `/api/livros/:id/pre-requisitar` | reservar um livro |
| POST | `/api/livros/:id/avaliar` | avaliar um livro |
| GET | `/api/requisicoes` | as minhas requisições |
| POST | `/api/requisicoes/:id/cancelar` | cancelar uma pré-requisição |

Os pedidos que exigem sessão levam o cabeçalho `Authorization: Bearer <token>`.

## Correr no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais recente.

```bash
npm install
npm run dev
```

Abre em http://localhost:3000. É preciso um ficheiro `.env.local` na raiz com:

```
DATABASE_URL=postgresql://utilizador:palavra-passe@servidor:5432/postgres
SESSION_SECRET=uma-frase-secreta-com-32-caracteres-ou-mais
```

Este ficheiro não vai para o GitHub (está no `.gitignore`). No Vercel, os mesmos valores
estão em Settings → Environment Variables.

## Publicar

O repositório está ligado ao Vercel: basta fazer `git push` para a branch `main`.
