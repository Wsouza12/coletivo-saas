import { NextResponse } from "next/server";
import { getConfig } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";
import { enviarMensagemGrupo, enviarMensagemIndividual } from "@/lib/evolution";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type EvolutionKey = { remoteJid?: string; fromMe?: boolean; id?: string; participant?: string };
type EvolutionContextInfo = { stanzaId?: string; participant?: string };
type EvolutionMessage = {
  conversation?: string;
  extendedTextMessage?: { text?: string; contextInfo?: EvolutionContextInfo };
  imageMessage?: { caption?: string; contextInfo?: EvolutionContextInfo };
  videoMessage?: { caption?: string; contextInfo?: EvolutionContextInfo };
};
type EvolutionData = { key?: EvolutionKey; message?: EvolutionMessage; messageType?: string; pushName?: string };

function extrairTexto(msg: EvolutionMessage | undefined): string {
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  return "";
}

function extrairReplyId(msg: EvolutionMessage | any): string | null {
  if (!msg) return null;
  return (
    msg.extendedTextMessage?.contextInfo?.stanzaId ??
    msg.messageContextInfo?.threadId?.[0]?.threadKey?.id ??
    msg.imageMessage?.contextInfo?.stanzaId ??
    msg.videoMessage?.contextInfo?.stanzaId ??
    null
  );
}

export async function POST(req: Request) {
  let body: { event?: string; data?: any } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ── Boas-vindas automático quando novo membro entra no grupo ──────────────
  // Evolution/Baileys emite este evento como "group-participants.update" (hífen);
  // aceitamos também a variante com pontos por segurança.
  const eventoNormalizado = (body.event ?? "").replace(/-/g, ".");
  if (eventoNormalizado.includes("participants")) {
    console.log("Evento de participantes:", body.event, JSON.stringify(body.data)?.slice(0, 300));
  }
  if (eventoNormalizado === "group.participants.update") {
    const { id: grupoJid, participants, action } = body.data ?? {};
    if (action === "add" && grupoJid && Array.isArray(participants)) {
      // Só envia boas-vindas no grupo de Avisos da Comunidade
      const vinculo = await prisma.grupoWhatsappCategoria.findFirst({
        where: { grupoId: grupoJid, categoria: "AVISOS_COMUNIDADE" }
      });
      if (vinculo) {
        for (const participantJid of participants as string[]) {
          const numero = participantJid.replace(/:\d+/, "").split("@")[0];
          // Delay aleatório 5–15s para parecer humano
          await new Promise(r => setTimeout(r, 5000 + Math.random() * 10000));
          try {
            const bvCompletion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: `Você é o administrador dos grupos de WhatsApp da "JN Compras Coletivas".
Escreva uma mensagem de boas-vindas humanizada, calorosa e informativa para um novo membro.
NÃO escreva o @ na mensagem — o sistema já inclui automaticamente antes do texto.

A mensagem deve:
1. Dar boas-vindas com calor e emoji
2. Explicar brevemente a dinâmica dos 4 grupos que temos:
   📦 *Grupo Pedidos* — só para solicitar abertura de caixa: envie o nome ou código do produto
   📋 *Grupo Catálogo* — fechado, só o admin posta: catálogos, produtos novos, promoções
   💡 *Grupo Ideias & Sugestões* — aberto para todos: troca de ideias no geral
   🛒 *Grupo Produtos Disponíveis* — caixas abertas postadas diariamente, prontas para reservar
3. Finalizar com algo acolhedor e convidativo

Tom: pessoal, animado, sem parecer robô. Máximo 8 linhas. Varie o texto a cada vez.`
                },
                { role: "user", content: `Número do novo membro: ${numero}` }
              ],
              model: "llama-3.1-8b-instant",
              temperature: 0.9,
            });
            const msgBv = bvCompletion.choices[0]?.message?.content?.trim() ??
              "Seja muito bem-vindo(a)! 🎉 Aqui a gente compra junto direto da fábrica com preço imbatível. Qualquer dúvida é só falar! 😊";

            const cleanJid = participantJid.replace(/:\d+/, "");
            await enviarMensagemGrupo(
              grupoJid,
              `@${numero} ${msgBv}`,
              undefined,
              [cleanJid]
            );
          } catch (err) {
            console.error("Erro ao enviar boas-vindas:", err);
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.event !== "messages.upsert") return NextResponse.json({ ok: true });

  const data = body.data as EvolutionData;
  const remoteJid = data?.key?.remoteJid ?? "";
  const fromMe = data?.key?.fromMe === true;
  const participante = data?.key?.participant ?? "";
  const texto = extrairTexto(data?.message).trim();
  const mensagemId = data?.key?.id ?? "";
  const replyId = extrairReplyId(data?.message);

  const adminPhone = process.env.ADMIN_WHATSAPP || "5522997951576";
  const cleanAdminPhone = adminPhone.replace(/\D/g, "");
  const isEnviadoPorAdmin = fromMe || participante.includes(cleanAdminPhone);

  if (!mensagemId || !texto) return NextResponse.json({ ok: true });

  // CASO 1: Admin respondeu a uma mensagem (Ensinando a IA)
  if (isEnviadoPorAdmin && replyId) {
    const pendente = await prisma.assistentePerguntaPendente.findFirst({
      where: { mensagemId: replyId, respondida: false }
    });
    
    if (pendente) {
      // Admin está ensinando a IA no grupo.
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "Você é um assistente de loja profissional e amigável. O gerente da loja te passou uma resposta rápida para a dúvida de um cliente. Reescreva a resposta do gerente de forma polida, completa e natural para ser enviada diretamente ao cliente. Não adicione informações inventadas, apenas melhore o tom. Aja como a própria loja." },
            { role: "user", content: `Pergunta do cliente: "${pendente.textoCliente}"\n\nResposta do gerente: "${texto}"` }
          ],
          model: "llama-3.1-8b-instant",
        });
        
        const respostaPolida = chatCompletion.choices[0]?.message?.content || texto;

        // Enviar pro grupo dando reply na mensagem que o admin acabou de responder (a de 'Vou consultar')
        await enviarMensagemGrupo(
          pendente.grupoJid,
          respostaPolida,
          replyId
        );

        // Salvar no banco
        await prisma.assistenteConhecimento.create({
          data: { pergunta: pendente.textoCliente, resposta: respostaPolida }
        });

        // Marcar como respondida
        await prisma.assistentePerguntaPendente.update({
          where: { id: pendente.id },
          data: { respondida: true }
        });
      } catch (err) {
        console.error("Erro no Groq ao processar resposta do admin:", err);
      }

      return NextResponse.json({ ok: true });
    }
  }

  // CASO 2: Mensagem normal de um grupo
  if (remoteJid.endsWith("@g.us") && !fromMe && participante) {
    const vinculos = await prisma.grupoWhatsappCategoria.findMany({
      where: { grupoId: remoteJid }
    });

    if (vinculos.length === 0) return NextResponse.json({ ok: true });

    const vinculoRobo = vinculos.find(v => v.categoria === "ROBO_APRENDIZ" || v.assistenteGroqAtivo);
    const aceitaSolicitacoes = vinculos.some(v => v.categoria === "SOLICITACOES");

    // SOLICITAÇÃO DE ABERTURA DE CAIXA POR CÓDIGO OU NOME
    if (aceitaSolicitacoes && texto) {
      let intent = { tipo: "nenhum", termo: "" };
      try {
        const intentChat = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "O usuário mandou uma mensagem num grupo de atacado. Extraia qual produto ele quer.\nRetorne APENAS um JSON: {\"tipo\": \"codigo\"|\"nome\"|\"categoria\"|\"nenhum\", \"termo\": \"string\"}.\n- Use 'codigo' se for uma referência curta alfanumérica.\n- Use 'nome' se for descrição de um produto específico (ex: garrafa, chaveiro).\n- Use 'categoria' se ele mencionou uma categoria geral (ex: Eletrônicos, Beleza, Ferramentas).\n- Use 'nenhum' se for apenas saudação ou conversa fiada."
            },
            { role: "user", content: texto }
          ],
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" }
        });
        intent = JSON.parse(intentChat.choices[0].message.content || "{}");
      } catch (err) {
        console.error("Erro ao analisar intencao:", err);
      }

      const cleanJid = participante.replace(/:\d+/, "");

      if (intent.tipo === "categoria" && intent.termo) {
        const linkCategoria = `${process.env.NEXT_PUBLIC_APP_URL || "https://drop-sync.vercel.app"}/?categoria=${encodeURIComponent(intent.termo)}`;
        const resposta = `Ah, você está procurando por produtos de ${intent.termo}! Para ver todos os itens dessa categoria que já temos na loja, acesse a vitrine aqui:\n${linkCategoria}`;
        await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
        return NextResponse.json({ ok: true });
      }

      if (intent.tipo !== "nenhum" && intent.termo) {
        const termoLimpo = intent.termo.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        let produtosEncontrados: any[] = [];
        
        if (termoLimpo.length > 0) {
          produtosEncontrados = await prisma.$queryRaw`
            SELECT id, nome, codigo FROM "ProdutoAtacado"
            WHERE (
              REPLACE(LOWER(REGEXP_REPLACE(codigo, '[^a-zA-Z0-9]', '', 'g')), 'i', 'l') = REPLACE(${termoLimpo}, 'i', 'l')
              OR nome ILIKE ${'%' + intent.termo + '%'}
            )
            LIMIT 3
          `;
        }

        // Se não achou pelo termo inteiro, tenta quebrar em palavras (se for nome longo)
        if (produtosEncontrados.length === 0 && intent.tipo === "nome") {
          const searchTerms = intent.termo.split(/[\\s,.;:!?]+/).filter(w => w.length > 2);
          if (searchTerms.length > 0) {
            produtosEncontrados = await prisma.produtoAtacado.findMany({
              where: {
                AND: searchTerms.map(term => ({
                  nome: { contains: term, mode: "insensitive" }
                }))
              },
              take: 3
            });
          }
        }

        const cleanJid = participante.replace(/:\\d+/, "");

        if (produtosEncontrados.length === 1) {
          const produto = produtosEncontrados[0];
          
          const rodadaAberta = await prisma.rodadaAtacado.findFirst({
            where: { produtoAtacadoId: produto.id, status: "ABERTA" }
          });

          if (rodadaAberta && rodadaAberta.slug) {
            const linkCaixa = `${process.env.NEXT_PUBLIC_APP_URL || "https://drop-sync.vercel.app"}/atacado/${rodadaAberta.slug}`;
            const resposta = `Boa notícia! Essa caixa já está aberta e disponível para reserva.\nClique no link abaixo para garantir suas unidades:\n${linkCaixa}`;
            await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
            return NextResponse.json({ ok: true });
          }

          const jaTemPendente = await prisma.solicitacaoAberturaCaixa.findFirst({
            where: { produtoAtacadoId: produto.id, grupoJid: remoteJid, status: "PENDENTE" }
          });

          if (!jaTemPendente) {
            await prisma.solicitacaoAberturaCaixa.create({
              data: {
                produtoAtacadoId: produto.id,
                grupoJid: remoteJid,
                compradorJid: participante,
                compradorNome: data?.pushName || "Comprador",
                compradorNumero: participante,
                mensagemId,
                codigoDigitado: produto.codigo || intent.termo,
              }
            });

            let respostaGroq = "Solicitação recebida! Em breve verificaremos a possibilidade de abrir essa caixa.";
            try {
              const chatCompletion = await groq.chat.completions.create({
                messages: [
                  { role: "system", content: "Você é um assistente de loja num grupo de WhatsApp. Um cliente solicitou a abertura de uma caixa. Responda em UMA ÚNICA FRASE super curta e direta. Confirme o pedido citando UMA VERSÃO BEM RESUMIDA DO NOME DO PRODUTO (máximo 3 palavras para o nome). Exemplo: 'Anotado! Já enviei para a gerência analisar a abertura da caixa do Ralo Inteligente. 📦' IMPORTANTE: Não use o nome do cliente na resposta e não adicione @." },
                  { role: "user", content: `Produto: ${produto.nome} (Código: ${produto.codigo}).` }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.3,
              });
              if (chatCompletion.choices[0]?.message?.content) {
                respostaGroq = chatCompletion.choices[0].message.content.trim();
              }
            } catch (err) {}

            await enviarMensagemGrupo(remoteJid, respostaGroq, mensagemId);
          } else {
            const resposta = `O pedido para abrir a caixa desse produto já está anotado e aguardando aprovação da gerência! 😉`;
            await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
          }
          return NextResponse.json({ ok: true });
        } else if (produtosEncontrados.length > 1) {
          // Mais de um encontrado por nome
          const listaStr = produtosEncontrados.map(p => `- ${p.nome} (Código: *${p.codigo}*)`).join("\n");
          
          const resposta = `Encontrei algumas opções parecidas com "${intent.termo}". Para solicitar, envie apenas o código do produto desejado abaixo:\n\n${listaStr}`;
          await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
          return NextResponse.json({ ok: true });
        } else {
          // Não encontrou nenhum - envia no grupo
          const resposta = `Poxa, não encontrei esse produto no sistema no momento. Vou consultar a gerência para cadastrarmos!\n\nVocê sabe me dizer o nome do produto ou de qual catálogo você tirou esse código?`;
          await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
          
          // Notifica o admin no painel
          await prisma.notificacao.create({
            data: {
              destinatario: "ADMIN",
              tipo: "PRODUTO_NAO_ENCONTRADO",
              titulo: `Produto não encontrado: ${intent.termo}`,
              mensagem: `O cliente ${data?.pushName || cleanJid} solicitou "${intent.termo}" no grupo, mas não foi encontrado no sistema. O bot perguntou qual o catálogo. Acompanhe a resposta no grupo do WhatsApp para fazer o pré-cadastro.`,
            }
          });

          return NextResponse.json({ ok: true });
        }
      }

      // Se intent.tipo === nenhum (ou falhou a busca)
      if (!vinculoRobo) {
        const cleanJid = participante.replace(/:\\d+/, "");
        const resposta = `Olá! Para solicitar a abertura de uma caixa, por favor, envie o *código* ou o *nome* do produto que você deseja.`;
        await enviarMensagemGrupo(remoteJid, resposta, mensagemId);
        return NextResponse.json({ ok: true });
      }
    }

    if (vinculoRobo) {
      const cleanJid = participante.replace(/:\d+/, "");
      const arrobaPessoa = cleanJid.split("@")[0];

      // Se a pessoa já tem uma pergunta pendente com a equipe (robô disse que ia
      // consultar e o admin ainda não respondeu), a IA decide se a nova mensagem
      // é CONTINUAÇÃO da anterior (junta e segue aguardando) ou uma PERGUNTA NOVA
      // (avisa pra esperar a 1ª). Sem apagar nada.
      // Pendência só conta se for recente (3h). Mais velha que isso é considerada
      // "esquecida" (admin não respondeu) e NÃO trava o cliente — o robô volta a
      // responder normalmente. Evita o loop de "aguarde" eterno.
      const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
      const perguntaPendente = await prisma.assistentePerguntaPendente.findFirst({
        where: {
          grupoJid: remoteJid,
          clienteJid: participante,
          respondida: false,
          createdAt: { gte: new Date(Date.now() - TRES_HORAS_MS) },
        },
        orderBy: { createdAt: "desc" },
      });

      if (perguntaPendente) {
        let ehContinuacao = false;
        try {
          const classif = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  'Decida se a NOVA mensagem é continuação/complemento da PERGUNTA ANTERIOR (mesma dúvida, dividida em partes) ou uma pergunta/assunto NOVO. Responda APENAS JSON: {"continuacao": true|false}.',
              },
              { role: "user", content: `PERGUNTA ANTERIOR: "${perguntaPendente.textoCliente}"\n\nNOVA MENSAGEM: "${texto}"` },
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            response_format: { type: "json_object" },
          });
          ehContinuacao = JSON.parse(classif.choices[0]?.message?.content || "{}").continuacao === true;
        } catch (err) {
          console.error("Erro ao classificar continuação:", err);
        }

        if (ehContinuacao) {
          // Junta o complemento à pergunta pendente pra o admin ver tudo; segue aguardando.
          await prisma.assistentePerguntaPendente.update({
            where: { id: perguntaPendente.id },
            data: { textoCliente: `${perguntaPendente.textoCliente} ${texto}`.slice(0, 1000) },
          }).catch(() => {});
          return NextResponse.json({ ok: true });
        }

        // Pergunta nova com a anterior ainda pendente → avisa pra aguardar (com @),
        // mas só 1x a cada 10 min pra não repetir o mesmo aviso em cada mensagem.
        const DEZ_MIN_MS = 10 * 60 * 1000;
        const ultimoAviso = perguntaPendente.ultimoAvisoEm?.getTime() ?? 0;
        if (Date.now() - ultimoAviso >= DEZ_MIN_MS) {
          await enviarMensagemGrupo(
            remoteJid,
            `@${arrobaPessoa} ainda tô confirmando sua pergunta anterior com a equipe — assim que tiver a resposta eu já te aviso aqui 🙂. Pode aguardar só um instante?`,
            mensagemId,
            [cleanJid]
          );
          await prisma.assistentePerguntaPendente
            .update({ where: { id: perguntaPendente.id }, data: { ultimoAvisoEm: new Date() } })
            .catch(() => {});
        }
        return NextResponse.json({ ok: true });
      }

      const baseConhecimento = await prisma.assistenteConhecimento.findMany({
        orderBy: { createdAt: "desc" },
        take: 30
      });

      const historicoTexto = baseConhecimento.map(c => `P: ${c.pergunta}\nR: ${c.resposta}`).join("\n\n");

      const systemPrompt = `Você é o Robô Aprendiz do DropyAtacado (o maior ecossistema de Compras Coletivas do Brasil).
Regra de ouro do nosso modelo: O cliente escolhe os produtos lançados no grupo da semana, paga a preço de fábrica (rateio da carga). Quando a carga da fábrica chega no nosso galpão, nós separamos e enviamos para a casa do cliente. Ele revende onde quiser com o lucro 100% dele! (Não somos dropshipping direto ao consumidor final).
Instruções da gerência para este grupo: ${vinculoRobo.assistenteGroqPrompt || "Responda de forma amigável e curta."}

BASE DE CONHECIMENTO (Respostas anteriores):
${historicoTexto}

REGRAS:
1. Se a pergunta do usuário puder ser respondida com certeza usando a Base de Conhecimento ou for uma interação simples (bom dia, obrigado), responda diretamente.
2. Se o usuário perguntar sobre preços, disponibilidade, frete, tamanhos ou QUALQUER regra que NÃO esteja claramente na Base de Conhecimento, você DEVE responder EXATAMENTE com a palavra: ASK_ADMIN
3. Nunca invente preços, promoções ou dados que não estão na Base de Conhecimento.`;

      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: texto }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.2,
        });

        const respostaGroq = chatCompletion.choices[0]?.message?.content?.trim() || "";

        if (respostaGroq === "ASK_ADMIN") {
          // Não sabe — avisa no grupo (sem cara de robô) que vai confirmar, com
          // @ + reply na pessoa. Guarda a pergunta pendente: o admin responde via
          // reply nessa mensagem e a IA aprende.
          const msgTexto = `@${arrobaPessoa} já já te respondo certinho — deixa eu confirmar isso com a equipe! 🙂`;

          const config = await getConfig();
          if (!config) return;
          const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
            method: "POST",
            headers: { apikey: config.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              number: remoteJid,
              text: msgTexto,
              options: { quoted: { key: { id: mensagemId } }, mentions: [cleanJid] },
              mentions: [cleanJid],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const sentMsgId = data.key?.id;
            if (sentMsgId) {
              await prisma.assistentePerguntaPendente.create({
                data: {
                  grupoJid: remoteJid,
                  clienteJid: participante,
                  mensagemId: sentMsgId, // ID da mensagem do Robô! O admin vai dar reply nela.
                  textoCliente: texto,
                }
              });
            }
          }
          return NextResponse.json({ ok: true });
        } else if (respostaGroq) {
          // Sabe a resposta — manda com @ + reply na pessoa.
          await enviarMensagemGrupo(
            remoteJid,
            `@${arrobaPessoa} ${respostaGroq}`,
            mensagemId,
            [cleanJid]
          );

          return NextResponse.json({ ok: true });
        }
      } catch (err) {
        console.error("Erro na integração com Groq:", err);
      }
    }

    // Moderador-por-DM aposentado: a moderação (continuação vs pergunta nova) é
    // feita dentro do fluxo do Robô Aprendiz acima, no próprio grupo, com @ + reply.
  }


  return NextResponse.json({ ok: true });
}
