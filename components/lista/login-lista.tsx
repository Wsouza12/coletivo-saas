"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginLista() {
  const router = useRouter();
  const [doc, setDoc] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (doc.replace(/\D/g, "").length < 11) return toast.error("CPF inválido");
    if (telefone.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido");
    setLoading(true);
    try {
      const r = await fetch("/api/lista-fornecedores/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compradorDoc: doc, compradorTelefone: telefone }),
      });
      const json = await r.json();
      if (!r.ok) { toast.error(json.error?.message ?? "Não encontrei sua compra"); return; }
      router.push("/fornecedores/minha-lista");
    } finally {
      setLoading(false);
    }
  }

  const inp = "w-full h-11 rounded-lg bg-[#0e0a05] border border-white/12 px-3 text-[#F5F1EA] placeholder:text-[#8a8071] text-sm focus:outline-none focus:border-[#F5A524]";
  return (
    <div className="flex flex-col gap-3">
      <input className={inp} placeholder="CPF" value={doc} onChange={(e) => setDoc(e.target.value)} />
      <input className={inp} placeholder="WhatsApp (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <button onClick={entrar} disabled={loading} className="h-11 rounded-lg bg-[#22C55E] text-[#08150C] font-bold hover:bg-[#16A34A] flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null} Entrar
      </button>
    </div>
  );
}
