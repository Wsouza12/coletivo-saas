import { LoginLista } from "@/components/lista/login-lista";

export const dynamic = "force-dynamic";

export default function EntrarListaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0906] p-4 text-[#F5F1EA]"
      style={{ backgroundImage: "linear-gradient(rgba(245,165,36,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,165,36,0.04) 1px,transparent 1px)", backgroundSize: "42px 42px" }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141009] p-6 shadow-xl flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-extrabold">Acessar minha lista</h1>
          <p className="text-sm text-[#B7AFA2]">Entre com o CPF e o WhatsApp que você usou na compra.</p>
        </div>
        <LoginLista />
        <a href="/fornecedores" className="text-center text-xs text-[#22C55E] underline">Ainda não comprou? Ver planos</a>
      </div>
    </div>
  );
}
