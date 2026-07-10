import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { prisma } from "@/lib/prisma";
import "./print.css";

// Formata moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default async function ImprimirCaixaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const rodada = await prisma.rodadaAtacado.findUnique({
    where: { id },
    include: {
      produtoAtacado: true,
      variacao: true,
      reservas: true
    }
  });
  
  if (!rodada) {
    notFound();
  }

  const config = await getConfiguracaoFinanceira();

  // Filtramos apenas reservas pagas para separação (embora caixa fechada geralmente já tenha todas pagas)
  const reservasPagas = rodada.reservas.filter((r) => r.status === "PAGO");
  
  // Total geral
  const totalUnidades = reservasPagas.reduce((acc, curr) => acc + curr.quantidade, 0);

  // Nome do produto (base + variacao se for o caso)
  const produtoNomeCompleto = rodada.variacao
    ? `${rodada.produtoAtacado.nome} - ${rodada.variacao.nome}`
    : rodada.produtoAtacado.nome;

  const remetenteNome = config.nomeRemetente || "Compras Coletivas JN";
  const remetenteDoc = config.docRemetente || "00.000.000/0001-00";
  const remetenteEnd = config.enderecoRemetente || "Preencha o endereço do remetente nas configurações";
  const remetenteCep = config.cepOrigem || "00000-000";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white text-black font-sans">
      <div className="max-w-3xl mx-auto no-print mb-8 bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold">Impressão de Documentos</h1>
          <p className="text-xs text-gray-500">Caixa: {produtoNomeCompleto}</p>
        </div>
      </div>

      {/* 1. FICHA DE SEPARAÇÃO (1 página) */}
      <div className="print-page">
        <div className="border-2 border-black p-4 h-full flex flex-col">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-lg font-bold uppercase">Ficha de Separação Geral</h1>
            <h2 className="text-sm mt-2">Produto: {produtoNomeCompleto}</h2>
            <p className="mt-1 text-xs">
              <strong>Total a separar:</strong> {totalUnidades} unidades |{" "}
              <strong>Participantes:</strong> {reservasPagas.length}
            </p>
          </div>

          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2">#</th>
                <th className="py-2">Nome</th>
                <th className="py-2">Qtd</th>
                <th className="py-2">Variações</th>
                <th className="py-2">Frete</th>
                <th className="py-2">CEP</th>
              </tr>
            </thead>
            <tbody>
              {reservasPagas.map((reserva, idx) => {
                let varsStr = "-";
                if (reserva.variacoes) {
                  try {
                    const parsed = typeof reserva.variacoes === 'string' ? JSON.parse(reserva.variacoes) : reserva.variacoes;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      // Simples resumo das variações (como temos o ID, podemos apenas indicar que tem variação)
                      // O ideal seria fazer o join com a tabela ProdutoAtacadoCor, mas para caixas fechadas 
                      // a variação geralmente já é definida na rodada. Se houver variação mista,
                      // o array terá {variacaoId, quantidade}.
                      varsStr = parsed.map((v: any) => `${v.quantidade}un`).join(", ");
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }

                return (
                  <tr key={reserva.id} className="border-b border-gray-300">
                    <td className="py-2 text-xs">{idx + 1}</td>
                    <td className="py-2 font-semibold text-sm">{reserva.compradorNome}</td>
                    <td className="py-2 font-bold text-base">{reserva.quantidade}</td>
                    <td className="py-2 text-[10px]">{varsStr}</td>
                    <td className="py-2 text-xs">{reserva.metodoFrete}</td>
                    <td className="py-2 text-xs">{reserva.cep}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-auto pt-8 flex justify-between items-end">
            <p className="text-xs">
              Data: {format(new Date(), "dd/MM/yyyy")}
            </p>
            <div className="w-48 border-t border-black text-center pt-1 text-xs">
              Assinatura do Separador
            </div>
          </div>
        </div>
      </div>

      {/* 2. ETIQUETAS DE ENVIO (Meia página por destinatário = 2 por folha) */}
      <div className="bg-white">
        {reservasPagas.map((reserva) => {
          let end = reserva.enderecoEntrega as any;
          if (!end || typeof end !== "object") {
             end = { logradouro: "", numero: "", bairro: "", cidade: "", uf: "" };
          }
          
          return (
            <div key={`etiqueta-${reserva.id}`} className="print-page-half">
              <div className="border-2 border-black p-4 h-full flex flex-col justify-between">
                
                {/* Remetente */}
                <div className="border-b-2 border-black pb-2 mb-2">
                  <h3 className="font-bold text-xs mb-1 uppercase">Remetente</h3>
                  <p className="font-semibold text-sm">{remetenteNome}</p>
                  <p className="text-xs">{remetenteEnd}</p>
                  <p className="text-xs">CEP: {remetenteCep}</p>
                </div>

                {/* Destinatário */}
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1 uppercase">Destinatário</h3>
                  <p className="text-lg font-bold mb-1 leading-tight">{reserva.compradorNome}</p>
                  <p className="text-xs mb-2">CPF: {reserva.compradorDoc}</p>
                  
                  <p className="text-sm leading-tight">
                    {end.logradouro}, {end.numero}
                    {end.complemento && ` - ${end.complemento}`}
                  </p>
                  <p className="text-sm leading-tight">
                    {end.bairro}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {end.cidade} / {end.uf}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    CEP: {reserva.cep}
                  </p>
                  <p className="mt-1 text-xs">Tel: {reserva.compradorTelefone}</p>
                </div>
                
                {/* Nota do User: NÃO mostrar produto e qtd na etiqueta */}
                {/* A etiqueta de envio pura, limpa */}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. DECLARAÇÃO DE CONTEÚDO (1 página inteira por destinatário) */}
      {reservasPagas.map((reserva) => {
        let end = reserva.enderecoEntrega as any;
        if (!end || typeof end !== "object") {
            end = { logradouro: "", numero: "", bairro: "", cidade: "", uf: "" };
        }

        // Recuperar variações bonitinhas se houver
        let varsStr = "";
        if (reserva.variacoes) {
          try {
            const parsed = typeof reserva.variacoes === 'string' ? JSON.parse(reserva.variacoes) : reserva.variacoes;
            if (Array.isArray(parsed) && parsed.length > 0) {
               // Em caixas fechadas com variações mistas, teríamos o ID. 
               // Como não temos o nome da cor fácil aqui sem carregar, apenas mostramos "Variado".
               // Se a caixa inteira tem UMA variação, já tá no produtoNomeCompleto.
               varsStr = " (Cores/Tamanhos Variados)";
            }
          } catch(e) {}
        }
        
        return (
          <div key={`dec-${reserva.id}`} className="print-page">
            <div className="border border-black p-4 h-full flex flex-col text-[13px] leading-tight relative">
              
              <div className="absolute top-2 right-2 border-2 border-dashed border-red-500 text-red-500 font-bold p-1 text-[10px] uppercase transform rotate-12">
                Deixar DENTRO<br/>da caixa
              </div>

              <div className="text-center font-bold text-base mb-2 border-b border-black pb-1">
                DECLARAÇÃO DE CONTEÚDO
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-b border-black pb-2 mb-2">
                <div className="text-xs">
                  <h3 className="font-bold underline mb-1">REMETENTE</h3>
                  <p>Nome: {remetenteNome}</p>
                  <p>CPF/CNPJ: {remetenteDoc}</p>
                  <p>Endereço: {remetenteEnd}</p>
                  <p>CEP: {remetenteCep}</p>
                </div>
                <div className="text-xs">
                  <h3 className="font-bold underline mb-1">DESTINATÁRIO</h3>
                  <p>Nome: {reserva.compradorNome}</p>
                  <p>CPF/CNPJ: {reserva.compradorDoc}</p>
                  <p>
                    Endereço: {end.logradouro}, {end.numero} {end.complemento}
                  </p>
                  <p>{end.bairro} - {end.cidade}/{end.uf}</p>
                  <p>CEP: {reserva.cep}</p>
                </div>
              </div>

              <h3 className="font-bold mb-2">IDENTIFICAÇÃO DOS BENS</h3>
              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 text-left w-12">Item</th>
                    <th className="border border-black p-1 text-left">Conteúdo</th>
                    <th className="border border-black p-1 text-center w-16">Qtd</th>
                    <th className="border border-black p-1 text-right w-24">Valor Unit.</th>
                    <th className="border border-black p-1 text-right w-24">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 text-center">1</td>
                    <td className="border border-black p-1">
                      {produtoNomeCompleto}{varsStr}
                    </td>
                    <td className="border border-black p-1 text-center">{reserva.quantidade}</td>
                    <td className="border border-black p-1 text-right">
                      {formatCurrency(Number(reserva.valorProduto) / reserva.quantidade)}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {formatCurrency(Number(reserva.valorProduto))}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border border-black p-1 text-right font-bold">TOTAIS</td>
                    <td className="border border-black p-1 text-right font-bold">
                      {formatCurrency(Number(reserva.valorProduto))}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex-1 text-justify mb-2 text-xs">
                <h3 className="font-bold mb-1">DECLARAÇÃO</h3>
                <p className="leading-tight">
                  Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da
                  Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em
                  volume que caracterize intuito comercial, operações de circulação de mercadoria,
                  ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal
                  por força da legislação tributária vigente, responsabilizando-me, nos termos da
                  lei e a quem de direito, por informações inverídicas.
                </p>
                <p className="mt-1 leading-tight">
                  Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador
                  de incêndio, ou qualquer outro item cujo transporte seja proibido pelos Correios
                  ou transportadoras.
                </p>
              </div>

              <div className="flex justify-between items-end border-t border-black pt-2 text-xs">
                <div>
                  _________________________, ____ de _________________ de ______<br/>
                  <span className="text-xs text-gray-500">(Local e Data)</span>
                </div>
                <div className="text-center">
                  __________________________________________________<br/>
                  <span className="text-xs">Assinatura do Remetente</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
    </div>
  );
}
