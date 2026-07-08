import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PoliticaReembolsoPage() {
  return (
    <div className="min-h-screen bg-[#EBEBEB] text-[#333]">
      <div className="bg-[#FFE600] px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center">
          <Link href="/" className="text-[#2D3277] hover:opacity-80 transition p-2 -ml-2 rounded-full hover:bg-black/5">
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-xl font-extrabold text-[#2D3277] ml-2">Política de Reembolso</h1>
        </div>
      </div>
      
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white rounded-md p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Política de Reembolso e Garantia</h2>
          
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Na <strong>{APP_NAME}</strong>, trabalhamos com o formato de Compras Coletivas, onde unimos lojistas para alcançar o pedido mínimo (fechamento da caixa) diretamente com o fornecedor.
            </p>
            
            <h3 className="text-lg font-medium text-[#333] mt-6">Regra de Fechamento da Caixa</h3>
            <p>
              Caso a caixa ou grupo de compra na qual você efetuou o seu pedido e realizou o pagamento <strong>não seja fechada no prazo de 15 dias corridos</strong>, o seu <strong>reembolso é garantido automaticamente</strong> e devolvido integralmente.
            </p>
            
            <p>
              Você não precisa se preocupar: monitoramos todos os grupos ativamente. Se o objetivo coletivo não for alcançado nesse período, nosso sistema processa o estorno para a mesma conta utilizada no pagamento.
            </p>

            <h3 className="text-lg font-medium text-[#333] mt-6">Dúvidas?</h3>
            <p>
              Se houver qualquer problema ou dúvida sobre o andamento da sua compra coletiva, sinta-se à vontade para entrar em contato através dos nossos canais de atendimento presentes no rodapé do nosso site.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
