import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-[#333]">
          
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#2D3277]">{APP_NAME}</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-2">
              A melhor plataforma de compras coletivas B2B. Conectando fabricantes diretamente a lojistas com segurança e praticidade.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Atendimento</h3>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>E-mail: <span className="font-medium text-[#333]">(Seu E-mail de Contato)</span></li>
              <li>Telefone: <span className="font-medium text-[#333]">(Seu Telefone / WhatsApp)</span></li>
              <li>Horário: <span className="font-medium text-[#333]">(Seu Horário de Atendimento)</span></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Informações Legais</h3>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>Razão Social: <span className="font-medium text-[#333]">(Razão Social da Empresa)</span></li>
              <li>CNPJ: <span className="font-medium text-[#333]">(00.000.000/0000-00)</span></li>
              <li>Endereço: <span className="font-medium text-[#333]">(Endereço Físico Completo)</span></li>
            </ul>
          </div>
          
        </div>

        <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
          </p>
          
          <div className="text-xs text-gray-400 text-center md:text-right">
            <p>Desenvolvido e Licenciado por</p>
            <p className="font-bold text-[#2D3277] mt-0.5">Pablo Wanderson</p>
            <p className="mt-0.5">Contato: <a href="https://wa.me/5522992687704" target="_blank" rel="noreferrer" className="text-[#3483FA] hover:underline font-medium">22 99268-7704</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
