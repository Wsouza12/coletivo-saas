import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PoliticaEntregasPage() {
  return (
    <div className="min-h-screen bg-[#EBEBEB] text-[#333]">
      <div className="bg-[#FFE600] px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center">
          <Link href="/" className="text-[#2D3277] hover:opacity-80 transition p-2 -ml-2 rounded-full hover:bg-black/5">
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-xl font-extrabold text-[#2D3277] ml-2">Política de Entregas</h1>
        </div>
      </div>
      
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-md p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Política de Fretes e Entregas</h2>
          
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Na <strong>{APP_NAME}</strong>, nossa responsabilidade abrange toda a negociação, o fechamento da caixa junto ao fornecedor e o preparo logístico das mercadorias.
            </p>
            
            <h3 className="text-lg font-medium text-[#333] mt-6">Rastreio e Envio</h3>
            <p>
              Toda entrega é rigorosamente <strong>documentada com rastreio de ponta a ponta</strong>. Trabalhamos exclusivamente com transportadoras selecionadas (ou Correios) sob consulta, permitindo que a escolha logística seja adequada à sua região e necessidade.
            </p>
            
            <h3 className="text-lg font-medium text-[#333] mt-6">Responsabilidade no Transporte</h3>
            <p>
              Após a coleta e <strong>saída da mercadoria do nosso galpão/fornecedor</strong>, a responsabilidade do transporte, bem como eventuais sinistros, furtos ou avarias durante o trajeto, passa a ser <strong>de responsabilidade do próprio cliente e da transportadora escolhida</strong>. 
            </p>
            <p>
              Por esse motivo, recomendamos sempre optar por envios com seguro completo para proteger a sua mercadoria de atacado de ponta a ponta. Nossa equipe sempre fornecerá as documentações necessárias e códigos de rastreamento para o acionamento de qualquer seguro.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
