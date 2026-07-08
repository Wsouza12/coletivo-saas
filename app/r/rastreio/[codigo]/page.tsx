import { redirect } from "next/navigation";

export default async function RedirectRastreioPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  redirect(`/atacado/rastreio/${codigo}`);
}
