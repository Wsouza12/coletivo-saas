"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, mascararTelefone, mascararCpfCnpj, mascararCep } from "@/lib/format";
import { PixQrCodeModal } from "@/components/atacado/pix-qrcode-modal";

type Etapa = "quantidade" | "endereco" | "contato" | "assinatura";

type VariacaoCheckout = { id: string; tipo: "TAMANHO" | "COR" | "VOLTAGEM"; nome: string };

export function AtacadoCheckout({
  rodadaId,
  custoUnitario,
  taxaServicoPercentual,
  minimoUnidadesPorReserva,
  unidadesRestantes,
  valorAssinaturaAtacado,
  exigirAssinaturaAtacado,
  variacoes = [],
  coresVariadas = false,
}: {
  rodadaId: string;
  custoUnitario: number;
  taxaServicoPercentual: number;
  minimoUnidadesPorReserva: number;
  unidadesRestantes: number;
  valorAssinaturaAtacado: number;
  exigirAssinaturaAtacado: boolean;
  variacoes?: VariacaoCheckout[];
  coresVariadas?: boolean;
}) {
  const [etapa, setEtapa] = useState<Etapa>("quantidade");
  const [loading, setLoading] = useState(false);
  
  // Assinatura (se exigida)
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);

  // Tamanhos disponíveis (quando produto tem variações de TAMANHO)
  const tamanhos = variacoes.filter((v) => v.tipo === "TAMANHO");
  const cores = variacoes.filter((v) => v.tipo === "COR");
  const temVariacoes = tamanhos.length > 0;

  // Etapa 1: Quantidade simples (sem variações) ou grade de tamanhos
  const [quantidade, setQuantidade] = useState(String(minimoUnidadesPorReserva));
  // grade[tamId] = quantidade, ou grade[tamId+"|"+corId] = quantidade para escolha livre
  const [grade, setGrade] = useState<Record<string, number>>({});

  // Quantidade efetiva: soma da grade (com variações) ou campo direto
  const quantidadeEfetiva = temVariacoes
    ? Object.values(grade).reduce((a, b) => a + b, 0)
    : Number(quantidade);
  const gradeValida = temVariacoes
    ? quantidadeEfetiva >= minimoUnidadesPorReserva && quantidadeEfetiva <= unidadesRestantes
    : false;

  // Etapa 2: Endereço (ViaCEP)
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [opcoesFrete, setOpcoesFrete] = useState<
    { id: string; nome: string; descricao: string; preco: number; prazoDias: number; recomendado: boolean }[] | null
  >(null);
  const [opcaoFreteId, setOpcaoFreteId] = useState<string | null>(null);

  // Etapa 3: Contato
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [telefone, setTelefone] = useState("");

  const [pix, setPix] = useState<{ qrCode: string; qrCodeBase64: string; valor: number; tipo: "assinatura" | "reserva"; reservaId?: string } | null>(null);

  const quantidadeValida = temVariacoes
    ? gradeValida
    : Number(quantidade) >= minimoUnidadesPorReserva && Number(quantidade) <= unidadesRestantes;
  const valorProdutoFornecedor = custoUnitario * (temVariacoes ? quantidadeEfetiva || 1 : Number(quantidade || 1));
  const valorTaxaServico = valorProdutoFornecedor * (taxaServicoPercentual / 100);
  
  const opcaoEscolhida = opcoesFrete?.find((o) => o.id === opcaoFreteId) ?? null;
  const valorTotal = opcaoEscolhida ? valorProdutoFornecedor + valorTaxaServico + opcaoEscolhida.preco : null;

  async function buscarCepEFrete(cepBusca: string) {
    const limpo = cepBusca.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    
    setLoading(true);
    try {
      // 1. Preenche endereço via ViaCEP
      const resCep = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const jsonCep = await resCep.json();
      if (!jsonCep.erro) {
        setLogradouro(jsonCep.logradouro || "");
        setBairro(jsonCep.bairro || "");
        setCidade(jsonCep.localidade || "");
        setUf(jsonCep.uf || "");
      }

      // 2. Calcula frete na nossa API
      const resFrete = await fetch("/api/atacado/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rodadaId, cep: limpo, quantidade: quantidadeEfetiva }),
      });
      const jsonFrete = await resFrete.json();
      if (!resFrete.ok) {
        toast.error(jsonFrete.error?.message ?? "Erro ao calcular frete");
        setOpcoesFrete(null);
        setOpcaoFreteId(null);
      } else {
        const opcoes = jsonFrete.data.opcoes;
        setOpcoesFrete(opcoes);
        // Pré-seleciona a opção recomendada (retirada) — cliente troca se preferir entrega.
        const recomendada = opcoes.find((o: { recomendado: boolean }) => o.recomendado);
        setOpcaoFreteId(recomendada?.id ?? null);
      }
    } catch {
      toast.error("Erro ao processar o CEP");
    } finally {
      setLoading(false);
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatado = mascararCep(e.target.value);
    setCep(formatado);
    setOpcoesFrete(null);
    setOpcaoFreteId(null);
    if (formatado.replace(/\D/g, "").length === 8) {
      buscarCepEFrete(formatado);
    }
  }

  async function avancarParaContato() {
    if (!opcaoFreteId || !numero || !cidade || !uf) {
      toast.error("Preencha o CEP, número e escolha um frete.");
      return;
    }
    setEtapa("contato");
  }

  async function finalizarOuAssinar() {
    if (!nome.trim() || doc.replace(/\D/g, "").length < 11 || telefone.replace(/\D/g, "").length < 10) {
      toast.error("Preencha todos os dados de contato corretamente.");
      return;
    }

    if (exigirAssinaturaAtacado && !assinaturaId) {
      // Verifica se ele tem assinatura antes de reservar
      setLoading(true);
      try {
        const res = await fetch(`/api/atacado/assinatura?doc=${encodeURIComponent(doc.trim())}`);
        const json = await res.json();
        if (json.data?.ativa) {
          setAssinaturaId(json.data.assinaturaId);
          reservar(json.data.assinaturaId);
        } else {
          setEtapa("assinatura");
          setLoading(false);
        }
      } catch {
        toast.error("Erro ao verificar assinatura");
        setLoading(false);
      }
    } else {
      // Vai direto pra reserva
      reservar();
    }
  }

  async function assinar() {
    setLoading(true);
    try {
      const res = await fetch("/api/atacado/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compradorNome: nome, compradorDoc: doc.trim(), compradorEmail: "sem-email@dropsync.com.br", compradorTelefone: telefone }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao iniciar assinatura");
        return;
      }
      if (json.data?.qrCode && json.data?.qrCodeBase64) {
        setPix({ qrCode: json.data.qrCode, qrCodeBase64: json.data.qrCodeBase64, valor: json.data.valor, tipo: "assinatura" });
      } else {
        toast.error("Mercado Pago não configurado — não foi possível gerar o Pix");
      }
    } finally {
      setLoading(false);
    }
  }

  async function reservar(idAssinaturaPassada?: string) {
    const idFinal = idAssinaturaPassada ?? assinaturaId;
    if (exigirAssinaturaAtacado && !idFinal) return;

    setLoading(true);
    try {
      const res = await fetch("/api/atacado/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rodadaId,
          compradorNome: nome.trim(),
          compradorDoc: doc.replace(/\D/g, ""),
          compradorTelefone: telefone.replace(/\D/g, ""),
          ...(temVariacoes
            ? {
                variacoes: Object.entries(grade)
                  .filter(([, qtd]) => qtd > 0)
                  .map(([key, qtd]) => {
                    const [variacaoId, corId] = key.split("|");
                    return { variacaoId, quantidade: qtd, ...(corId ? { corId } : {}) };
                  }),
              }
            : { quantidade: Number(quantidade) }),
          cep: cep.replace(/\D/g, ""),
          opcaoFreteId,
          enderecoEntrega: { logradouro, numero, complemento, bairro, cidade, uf },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao reservar");
        return;
      }
      if (json.data?.qrCode && json.data?.qrCodeBase64) {
        setPix({
          qrCode: json.data.qrCode,
          qrCodeBase64: json.data.qrCodeBase64,
          valor: json.data.valorTotal,
          tipo: "reserva",
          reservaId: json.data.reservaId,
        });
      } else {
        toast.error("Mercado Pago não configurado — não foi possível gerar o Pix");
      }
    } finally {
      setLoading(false);
    }
  }

  const checarStatusPix = useCallback(async (): Promise<boolean> => {
    if (!pix) return false;
    if (pix.tipo === "assinatura") {
      const res = await fetch(`/api/atacado/assinatura?doc=${encodeURIComponent(doc.replace(/\D/g, ""))}`);
      const json = await res.json();
      return Boolean(json.data?.ativa);
    }
    const res = await fetch(`/api/atacado/reservas/${pix.reservaId}`);
    const json = await res.json();
    return json.data?.status === "PAGO";
  }, [pix, doc]);

  function handlePixConfirmado() {
    if (!pix) return;
    if (pix.tipo === "assinatura") {
      toast.success("Assinatura confirmada! Gerando PIX da reserva...");
      setPix(null);
      // Busca a assinatura pra pegar o ID e chama reservar
      fetch(`/api/atacado/assinatura?doc=${encodeURIComponent(doc.replace(/\D/g, ""))}`)
        .then(r => r.json())
        .then(j => {
           setAssinaturaId(j.data?.assinaturaId);
           reservar(j.data?.assinaturaId);
        });
    } else {
      toast.success("Pagamento confirmado! Sua reserva está garantida.");
      setPix(null);
      window.location.reload();
    }
  }

  return (
    <>
      {pix ? (
        <PixQrCodeModal
          open
          qrCode={pix.qrCode}
          qrCodeBase64={pix.qrCodeBase64}
          valor={pix.valor}
          checarStatus={checarStatusPix}
          onConfirmado={handlePixConfirmado}
          onClose={() => setPix(null)}
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border p-4 bg-card shadow-sm">
        {/* PROGRESSO */}
        <div className="flex gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          <span className={etapa === "quantidade" ? "text-primary" : ""}>1. Qtd</span>
          <span>&gt;</span>
          <span className={etapa === "endereco" ? "text-primary" : ""}>2. CEP</span>
          <span>&gt;</span>
          <span className={etapa === "contato" || etapa === "assinatura" ? "text-primary" : ""}>3. Pagamento</span>
        </div>

        {/* ETAPA 1: QUANTIDADE / GRADE DE TAMANHOS */}
        {etapa === "quantidade" && (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            {temVariacoes ? (
              <>
                <Label className="text-lg">
                  Escolha os tamanhos
                  {coresVariadas ? <span className="ml-2 text-xs font-normal text-muted-foreground">(cores sortidas)</span> : null}
                </Label>

                {/* Grade variada ou escolha livre de tamanho */}
                {coresVariadas || cores.length === 0 ? (
                  // Grade variada: só tamanho × quantidade
                  <div className="flex flex-col gap-2">
                    {tamanhos.map((tam) => (
                      <div key={tam.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <span className="w-10 text-center text-base font-bold">{tam.nome}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-full border text-lg font-bold hover:bg-muted"
                            onClick={() => setGrade((g) => ({ ...g, [tam.id]: Math.max(0, (g[tam.id] ?? 0) - 1) }))}
                          >−</button>
                          <span className="w-8 text-center text-base font-semibold">{grade[tam.id] ?? 0}</span>
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-full border text-lg font-bold hover:bg-muted"
                            onClick={() => setGrade((g) => ({ ...g, [tam.id]: (g[tam.id] ?? 0) + 1 }))}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Escolha livre: tamanho × cor — grade completa
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="py-1 pr-3 text-left font-medium text-muted-foreground"></th>
                          {cores.map((c) => (
                            <th key={c.id} className="px-2 py-1 text-center font-medium">{c.nome}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tamanhos.map((tam) => (
                          <tr key={tam.id}>
                            <td className="py-1 pr-3 font-bold">{tam.nome}</td>
                            {cores.map((cor) => {
                              const key = `${tam.id}|${cor.id}`;
                              return (
                                <td key={cor.id} className="px-2 py-1 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={grade[key] ?? 0}
                                    onChange={(e) => setGrade((g) => ({ ...g, [key]: Math.max(0, Number(e.target.value)) }))}
                                    className="w-16 text-center"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total: <strong>{quantidadeEfetiva} un.</strong></span>
                  <span className="text-muted-foreground">Mínimo {minimoUnidadesPorReserva} un. · restam {unidadesRestantes}</span>
                </div>
              </>
            ) : (
              <>
                <Label className="text-lg">Quantas unidades?</Label>
                <Input
                  type="number"
                  min={minimoUnidadesPorReserva}
                  max={unidadesRestantes}
                  value={quantidade}
                  className="text-lg py-6"
                  onChange={(e) => setQuantidade(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">
                  Mínimo {minimoUnidadesPorReserva} un. — restam {unidadesRestantes} un. nessa caixa.
                </span>
              </>
            )}

            <Button
              size="lg"
              className="mt-2"
              disabled={!quantidadeValida}
              onClick={() => setEtapa("endereco")}
            >
              Continuar
            </Button>
          </div>
        )}

        {/* ETAPA 2: ENDEREÇO & FRETE */}
        {etapa === "endereco" && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <Label className="text-lg">Endereço de Entrega</Label>
              <Button variant="ghost" size="sm" onClick={() => setEtapa("quantidade")}>Voltar</Button>
            </div>
            
            <div className="space-y-3">
              <Label>CEP</Label>
              <Input
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="text-lg"
              />

              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={cidade} readOnly className="bg-muted" />
                </div>
                <div className="w-16 space-y-1">
                  <Label className="text-xs">UF</Label>
                  <Input value={uf} readOnly className="bg-muted text-center" />
                </div>
              </div>

              {cidade && (
                <div className="flex gap-2 animate-in fade-in">
                  <div className="w-1/3 space-y-1">
                    <Label className="text-xs">Número</Label>
                    <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Complemento (opcional)</Label>
                    <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco..." />
                  </div>
                </div>
              )}
            </div>

            {loading && <div className="text-sm text-muted-foreground">Buscando CEP e fretes...</div>}

            {opcoesFrete && !loading && (
              <div className="flex flex-col gap-2 mt-2">
                <Label>Como prefere receber?</Label>
                {opcoesFrete.map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => setOpcaoFreteId(opcao.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                      opcaoFreteId === opcao.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {opcao.nome}
                        {opcao.recomendado ? (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Recomendado
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{opcao.descricao}</span>
                      {opcao.prazoDias > 0 && <span className="text-xs text-muted-foreground">até {opcao.prazoDias} dia(s)</span>}
                    </div>
                    <span className="font-bold text-foreground">
                      {opcao.preco > 0 ? formatBRL(opcao.preco) : "Grátis"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Button
              size="lg"
              className="mt-2"
              disabled={loading || !opcaoFreteId || !numero || !cidade}
              onClick={avancarParaContato}
            >
              Continuar
            </Button>
          </div>
        )}

        {/* ETAPA 3: CONTATO E PAGAMENTO */}
        {etapa === "contato" && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <Label className="text-lg">Dados de Contato</Label>
              <Button variant="ghost" size="sm" onClick={() => setEtapa("endereco")}>Voltar</Button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome Completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" />
              </div>
              <div className="space-y-1">
                <Label>CPF ou CNPJ</Label>
                <Input value={doc} onChange={(e) => setDoc(mascararCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>

            {opcaoEscolhida && (
              <div className="rounded-lg bg-muted p-3 text-sm mt-2">
                <div className="flex justify-between"><span>Produto ({quantidade}un)</span><span>{formatBRL(valorProdutoFornecedor)}</span></div>
                <div className="flex justify-between"><span>Taxa de Serviço ({taxaServicoPercentual}%)</span><span>{formatBRL(valorTaxaServico)}</span></div>
                <div className="flex justify-between"><span>Frete</span><span>{opcaoEscolhida.preco > 0 ? formatBRL(opcaoEscolhida.preco) : "Grátis"}</span></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-base"><span>Total</span><span>{formatBRL(valorTotal ?? 0)}</span></div>
              </div>
            )}

            <Button
              size="lg"
              className="mt-2 font-bold bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || !nome || !doc || !telefone}
              onClick={finalizarOuAssinar}
            >
              {loading ? "Processando..." : "Gerar PIX e Reservar"}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-[-8px]">
              Sua reserva só será computada na caixa após o pagamento.
            </p>
          </div>
        )}

        {/* ETAPA ASSINATURA (SE EXIGIDA E NÃO TIVER) */}
        {etapa === "assinatura" && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300 rounded-xl border border-warning/40 bg-warning/5 p-4 mt-2">
            <h3 className="font-bold text-foreground">Atenção! Você precisa assinar o grupo.</h3>
            <p className="text-sm text-muted-foreground">
              Você ainda não faz parte do nosso grupo de compras coletivas.
              Assine por {formatBRL(valorAssinaturaAtacado)}/mês pra poder participar desta e de outras rodadas!
            </p>
            <Button onClick={assinar} disabled={loading} size="lg">
              {loading ? "Gerando Pix..." : "Pagar Assinatura com Pix"}
            </Button>
            <Button variant="ghost" onClick={() => setEtapa("contato")} disabled={loading}>
              Voltar
            </Button>
          </div>
        )}

      </div>
    </>
  );
}
