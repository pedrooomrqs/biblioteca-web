import { redirect } from "next/navigation";
import { utilizadorAtual } from "@/lib/auth";
import { EntrarForm } from "@/components/EntrarForm";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const utilizador = await utilizadorAtual();
  if (utilizador) redirect("/");
  const { next } = await searchParams;
  return <EntrarForm next={next && next.startsWith("/") ? next : "/"} />;
}
