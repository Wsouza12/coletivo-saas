import { z } from "zod";

export const createProdutoSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  descricaoHtml: z.string().optional(),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  subcategoria: z.string().optional(),
  precoAtacado: z.number().positive("Preço de atacado deve ser positivo"),
  custoReal: z.number().positive().optional(),
  ncm: z.string().optional(),
  pesoKg: z.number().positive("Peso deve ser positivo"),
  dimensoes: z
    .object({
      comprimento: z.number().positive(),
      largura: z.number().positive(),
      altura: z.number().positive(),
    })
    .optional(),
  estoque: z.number().int().min(0).default(0),
  estoqueMinimo: z.number().int().min(0).default(5),
  ativo: z.boolean().default(true),
  destaque: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  atributos: z.record(z.string(), z.string()).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  gtin: z.string().optional(),
  mpn: z.string().optional(),
  condicao: z.string().optional(),
  tipoAnuncio: z.string().optional(),
  garantiaTipo: z.string().optional(),
  garantiaPrazo: z.string().optional(),
  garantiaCondicoes: z.string().optional(),
  categoriaMlId: z.string().optional(),
  atributosMl: z
    .record(z.string(), z.object({ value_id: z.string().optional(), value_name: z.string().optional() }))
    .optional(),
  // imagens são enviadas depois da criação via POST /api/admin/produtos/[id]/imagens
  // (upload multipart não cabe num único payload JSON) — exigir min 1 fica a cargo da UI.
  imagens: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        ordem: z.number().int().default(0),
        principal: z.boolean().default(false),
      })
    )
    .optional()
    .default([]),
  temVariacoes: z.boolean().optional().default(false),
  // Medida física real (cm), preenchida pelo admin — nunca por IA. Chaves variam por
  // domínio ML (ex: GARMENT_WAIST_WIDTH_FROM/TO), descobertas via API, não fixadas aqui.
  variacoes: z
    .array(
      z.object({
        tamanho: z.string().min(1, "Tamanho é obrigatório"),
        sizeValueId: z.string().optional(),
        cor: z.string().optional().default(""),
        corValueId: z.string().optional(),
        estoque: z.number().int().min(0).default(0),
        precoAjuste: z.number().optional(),
        medidas: z.record(z.string(), z.string()).optional(),
        ordem: z.number().int().default(0),
        ativo: z.boolean().default(true),
      })
    )
    .optional()
    .default([]),
});

export const updateProdutoSchema = createProdutoSchema.partial();

// Publica produto único OU kit — exatamente um dos dois deve vir preenchido.
export const publishAnuncioSchema = z
  .object({
    produtoId: z.string().min(1).optional(),
    kitId: z.string().min(1).optional(),
    plataforma: z.enum(["MERCADOLIVRE", "SHOPEE"]),
    precoVenda: z.number().positive("Preço de venda deve ser positivo"),
    titulo: z.string().min(1, "Título é obrigatório").max(120),
    freteGratis: z.boolean().optional().default(false),
  })
  .refine((data) => !!data.produtoId !== !!data.kitId, {
    message: "Informe produtoId ou kitId, nunca os dois nem nenhum",
  });

export const kitItemSchema = z.object({
  produtoId: z.string().min(1),
  quantidade: z.number().int().positive(),
});

export const createKitSchema = z.object({
  nome: z.string().min(1, "Nome do kit é obrigatório").max(120),
  descricao: z.string().max(500).optional(),
  precoVenda: z.number().positive("Preço de venda deve ser positivo").optional(),
  itens: z.array(kitItemSchema).min(2, "Um kit precisa de pelo menos 2 produtos"),
});

export const updateKitSchema = createKitSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export const pedidoStatusEnum = z.enum([
  "NOVO",
  "CONFIRMADO",
  "SEPARANDO",
  "EMBALANDO",
  "AGUARDANDO_COLETA",
  "ENVIADO",
  "ENTREGUE",
  "CANCELADO",
  "DEVOLVIDO",
]);

export const updatePedidoStatusSchema = z.object({
  status: pedidoStatusEnum,
  rastreio: z.string().optional(),
  transportadora: z.string().optional(),
  notaFiscal: z.string().optional(),
  motivoCancelamento: z.string().optional(),
});

export const etapaPedidoFormSchema = z.object({
  etapa: pedidoStatusEnum,
});

export const registerLojistaSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string(),
    storeName: z.string().min(1, "Nome da loja é obrigatório"),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const updatePerfilSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").optional(),
  })
  .refine((data) => !data.newPassword || !!data.currentPassword, {
    message: "Informe a senha atual para definir uma nova senha",
    path: ["currentPassword"],
  });

export const updateLojistaPerfilSchema = z.object({
  storeName: z.string().min(1, "Nome da loja é obrigatório"),
  phone: z.string().optional(),
  document: z.string().optional(),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
});

export const createDevolucaoSchema = z.object({
  pedidoId: z.string().min(1, "Pedido é obrigatório"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
});

export const updateDevolucaoSchema = z.object({
  status: z.enum(["SOLICITADA", "EM_ANDAMENTO", "REEMBOLSADA", "NEGADA"]),
  valorReembolso: z.number().positive().optional(),
});

export const categoriaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ativa: z.boolean().default(true),
});

export const configuracaoNotificacaoSchema = z.object({
  emailNovoPedido: z.boolean(),
  emailLojistaAprovado: z.boolean(),
});

export const configuracaoFinanceiraSchema = z.object({
  margemPadrao: z.number().min(0).max(1000),
  margemOperacional: z.number().min(0).max(1000),
  tipoVendedorShopee: z.enum(["CNPJ", "CPF_INDIVIDUAL"]).optional(),
  cepOrigem: z.string().min(8).max(9).optional(),
  valorAssinaturaAtacado: z.number().min(0).optional(),
  taxaServicoPadraoAtacado: z.number().min(0).max(100).optional(),
  taxaServicoAssinanteAtacado: z.number().min(0).max(100).optional(),
  exigirAssinaturaAtacado: z.boolean().optional(),
  loopDescansoInicio: z.number().int().min(0).max(23).optional(),
  loopDescansoFim: z.number().int().min(0).max(23).optional(),
  precoListaFornecedores: z.number().min(0).optional(),
  precoCatalogosSemContato: z.number().min(0).optional(),
  precoUpsellComunidade: z.number().min(0).optional(),
  margemSegurancaFrete: z.number().min(0).max(100).optional(),
});

export const criarRodadaAtacadoSchema = z.object({
  produtoAtacadoId: z.string().min(1),
  metaUnidades: z.number().int().min(1),
  taxaServicoPercentual: z.number().min(0).max(100).default(10),
  minimoUnidadesPorReserva: z.number().int().min(1).default(1),
  unidadesReservadasLoja: z.number().int().min(0).default(0),
  dataLimite: z.string().datetime().optional(),
  variacaoId: z.string().min(1).optional(),
  loopAtivo: z.boolean().default(false),
  loopIntervaloMinutos: z.number().int().min(1).default(1440),
});

export const criarProdutoAtacadoSchema = z.object({
  codigo: z.string().min(1).optional(),
  nome: z.string().min(2),
  descricao: z.string().min(1),
  categoria: z.string().min(1),
  imagemUrl: z.string().url().optional(),
  marca: z.string().min(1).optional(),
  voltagem: z.string().min(1).optional(),
  codigoAnatel: z.string().min(1).optional(),
  custoUnitario: z.number().positive(),
  precoCatalogo: z.number().positive().optional(),
  precoVendaSugerido: z.number().positive().optional(),
  linkReferencia: z.string().url().optional().or(z.literal("")),
  posicaoMaisVendido: z.number().int().min(1).optional(),
  linkConviteWhatsapp: z.string().url().optional().or(z.literal("")),
  reservaLojaPadrao: z.number().int().min(0).optional(),
  unidadesPorCaixa: z.number().int().min(1),
  pesoKg: z.number().positive("Peso é obrigatório"),
  comprimentoCm: z.number().int().min(1, "Comprimento é obrigatório"),
  larguraCm: z.number().int().min(1, "Largura é obrigatório"),
  alturaCm: z.number().int().min(1, "Altura é obrigatório"),
  fornecedorId: z.string().min(1).optional(),
  coresVariadas: z.boolean().optional().default(false),
  tamanhosInput: z.string().optional(),
  coresInput: z.string().optional(),
});

export const updateProdutoAtacadoSchema = criarProdutoAtacadoSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export const fornecedorAtacadoSchema = z.object({
  nome: z.string().min(2),
  catalogo: z.string().min(1).optional(),
  telefone: z.string().min(8).optional(),
  endereco: z.string().min(1).optional(),
  vendedorNome: z.string().min(1).optional(),
  horarioAtendimento: z.string().min(1).optional(),
  pedidoMinimo: z.string().min(1).optional(),
  atualizado: z.boolean().optional(),
  usarModeloMinimo: z.boolean().optional().default(false),
  pedidoMinimoValor: z.coerce.number().positive().optional(),
});

export const catalogoFornecedorItemSchema = z.object({
  pagina: z.number().int().min(1),
  codigo: z.string().min(1).optional(),
  nomeProduto: z.string().min(1),
});

// Pré-cadastro feito direto no índice do catálogo PDF — cria um produto de
// verdade no Catálogo do Atacado (foto vem do recorte da página, opcional).
export const preCadastroItemCatalogoSchema = z.object({
  pagina: z.coerce.number().int().min(1),
  codigo: z.string().min(1).optional(),
  nomeProduto: z.string().min(1),
  categoria: z.string().min(1),
  marca: z.string().min(1).optional(),
  voltagem: z.string().min(1).optional(),
  codigoAnatel: z.string().min(1).optional(),
  unidadesPorCaixa: z.coerce.number().int().min(1),
  custoUnitario: z.coerce.number().positive(),
  precoCatalogo: z.coerce.number().positive().optional(),
  precoVendaSugerido: z.coerce.number().positive().optional(),
  linkReferencia: z.string().url().optional().or(z.literal("")),
  posicaoMaisVendido: z.coerce.number().int().min(1).optional(),
  reservaLojaPadrao: z.coerce.number().int().min(0).optional(),
  pesoKg: z.coerce.number().positive("Peso é obrigatório"),
  comprimentoCm: z.coerce.number().int().min(1, "Comprimento é obrigatório"),
  larguraCm: z.coerce.number().int().min(1, "Largura é obrigatório"),
  alturaCm: z.coerce.number().int().min(1, "Altura é obrigatório"),
  coresInput: z.string().optional(),
  tamanhosInput: z.string().optional(),
  coresVariadas: z.coerce.boolean().optional().default(false),
});

export const iniciarAssinaturaAtacadoSchema = z.object({
  compradorNome: z.string().min(2),
  compradorDoc: z.string().min(11).max(18),
  compradorEmail: z.string().email(),
  compradorTelefone: z.string().min(8),
});

export const variacaoReservaSchema = z.object({
  variacaoId: z.string().min(1),
  quantidade: z.number().int().min(1),
  // Para escolha livre (não grade variada): cor selecionada separada do tamanho
  corId: z.string().optional(),
});

export const criarReservaAtacadoSchema = z.object({
  rodadaId: z.string().min(1),
  compradorNome: z.string().min(2),
  compradorDoc: z.string().min(11).max(18),
  compradorTelefone: z.string().min(10).max(15),
  // Para produto SEM variações: quantidade direta. Para produto COM variações:
  // opcional — calculado automaticamente como soma das variacoes.
  quantidade: z.number().int().min(1).optional(),
  variacoes: z.array(variacaoReservaSchema).optional(),
  cep: z.string().min(8).max(9),
  opcaoFreteId: z.string().min(1),
  enderecoEntrega: z.object({
    logradouro: z.string().min(1),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    bairro: z.string().min(1),
    cidade: z.string().min(1),
    uf: z.string().length(2),
  }),
});

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
export type PublishAnuncioInput = z.infer<typeof publishAnuncioSchema>;
export type CreateKitInput = z.infer<typeof createKitSchema>;
export type UpdateKitInput = z.infer<typeof updateKitSchema>;
export type UpdatePedidoStatusInput = z.infer<typeof updatePedidoStatusSchema>;
export type RegisterLojistaInput = z.infer<typeof registerLojistaSchema>;
export type UpdatePerfilInput = z.infer<typeof updatePerfilSchema>;
export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type ConfiguracaoNotificacaoInput = z.infer<typeof configuracaoNotificacaoSchema>;
