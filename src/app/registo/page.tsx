import { redirect } from "next/navigation";
import { utilizadorAtual } from "@/lib/auth";
import { RegistoForm } from "@/components/RegistoForm";

export default async function RegistoPage() {
  const utilizador = await utilizadorAtual();
  if (utilizador) redirect("/");
  return <RegistoForm />;
}
