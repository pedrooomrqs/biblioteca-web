import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { utilizadorAtual } from "@/lib/auth";
import { sairAction } from "./actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Biblioteca Escolar",
  description: "Catálogo online da biblioteca escolar — Agrupamento de Escolas Dr. Ginestal Machado.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const utilizador = await utilizadorAtual();

  return (
    <html lang="pt-PT" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <nav className="bg-brand text-white sticky top-0 z-10 shadow">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="font-semibold text-lg">
              📚 Biblioteca Escolar
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Catálogo
              </Link>
              {utilizador ? (
                <>
                  <Link href="/minhas-requisicoes" className="hover:underline">
                    As minhas requisições
                  </Link>
                  <span className="text-white/80">{utilizador.nome}</span>
                  <form action={sairAction}>
                    <button
                      type="submit"
                      className="rounded border border-white/40 px-3 py-1 hover:bg-white/10"
                    >
                      Sair
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/entrar" className="hover:underline">
                    Entrar
                  </Link>
                  <Link
                    href="/registo"
                    className="rounded bg-white text-brand px-3 py-1 font-medium hover:bg-white/90"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-linha py-4 text-center text-sm text-suave">
          Biblioteca Escolar · Agrupamento de Escolas Dr. Ginestal Machado
        </footer>
      </body>
    </html>
  );
}
