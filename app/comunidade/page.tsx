import Image from "next/image";
import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, ArrowRight } from "lucide-react";

// Aqui você pode colocar o link oficial do seu grupo
const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/BaOrOZa2Doq8hsOS1lMTlP";

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-emerald-500/30 overflow-hidden shadow-lg">
            <Image 
              src="/logo-jn.png.jpeg" 
              alt="JN Compras Coletivas" 
              width={128} 
              height={128} 
              className="object-contain w-full h-full p-2"
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight">
          Grupo VIP Liberado!
        </h1>
        
        <p className="text-emerald-100/80 text-lg">
          Você está a um passo de acessar nossos fornecedores e participar das <strong className="text-white">Compras Coletivas</strong> com preço de custo.
        </p>

        <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-500/20 space-y-3 text-sm text-emerald-200 text-left mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>Acesso a produtos com preço de importador</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>Sem precisar comprar caixas fechadas</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{APP_NAME} cuidando de todo o envio</span>
          </div>
        </div>

        <a 
          href={WHATSAPP_GROUP_LINK}
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full h-14 text-lg font-semibold shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all hover:scale-105 inline-flex items-center justify-center shrink-0"
        >
          Entrar no Grupo Agora
          <ArrowRight className="w-5 h-5 ml-2" />
        </a>
        
        <p className="text-xs text-emerald-200/50 mt-4">
          Vagas limitadas. O grupo pode lotar a qualquer momento.
        </p>
      </div>
    </div>
  );
}
