import Link from "next/link";
import { Users, PackageOpen, Wallet, Truck, TrendingUp, ArrowRight, Crown, Check, X, Smartphone } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

const PASSO_A_PASSO = [
  { 
    passo: "01", 
    titulo: "Grupos por Categoria", 
    descricao: "Nossa comunidade é dividida em grupos menores (Eletrônicos, Casa, etc). Entre apenas nos grupos dos produtos que quer comprar.",
    icon: Users
  },
  { 
    passo: "02", 
    titulo: "Lançamento da Caixa", 
    descricao: "Toda semana abrimos uma 'Rodada' dentro desses grupos, liberando o Catálogo da vez com preços de fábrica.",
    icon: PackageOpen
  },
  { 
    passo: "03", 
    titulo: "Reserva e Pagamento", 
    descricao: "Você faz a reserva da quantidade que quer e paga o valor de custo. Juntamos o pedido de todos para atingir a meta da fábrica.",
    icon: Wallet
  },
  { 
    passo: "04", 
    titulo: "Receba na sua casa", 
    descricao: "Assim que a carga principal chega no nosso galpão, nós separamos a sua parte e enviamos direto para o seu endereço.",
    icon: Truck
  },
  { 
    passo: "05", 
    titulo: "Lucro 100% Seu", 
    descricao: "Com os produtos em mãos, você revende na sua loja, Mercado Livre, Shopee ou Instagram com a margem que quiser!",
    icon: TrendingUp
  },
];

const COMPARACAO = [
  { antigo: "Comprar sozinho pagando mais caro", novo: "Comprar junto e pagar preço de fábrica" },
  { antigo: "Quantidade mínima exigida absurdamente alta", novo: "Reserve só o que você precisa no grupo" },
  { antigo: "Ficar de fora das novidades dos fornecedores", novo: "Catálogos novos lançados toda semana" },
  { antigo: "Falta de suporte para lojistas", novo: "Robô Auxiliar disponível na hora para dúvidas" },
];

const FAQ = [
  {
    pergunta: "Preciso comprar uma quantidade muito grande?",
    resposta: "Não! Esse é o poder da compra coletiva. Nós juntamos o pedido de várias pessoas do grupo para atingir a quantidade mínima que a fábrica exige. Você compra só a sua parte.",
  },
  {
    pergunta: "Onde eu recebo os produtos?",
    resposta: "Nós recebemos a carga gigantesca da fábrica no nosso galpão, separamos o seu pedido certinho e enviamos diretamente para a porta da sua casa ou loja.",
  },
  {
    pergunta: "Em quais marketplaces posso revender?",
    resposta: "Como os produtos vão chegar fisicamente para você, você pode vender onde quiser! Mercado Livre, Shopee, Amazon, loja física, grupos de Facebook ou no seu Instagram.",
  },
  {
    pergunta: "Quanto custa para participar dos grupos?",
    resposta: "A entrada nos grupos e o acesso aos catálogos é 100% gratuito. Você só paga pelos produtos que escolher reservar na rodada.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.15),rgba(0,0,0,0))]" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-1.5 text-lg font-bold">
            <Crown className="size-5 text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </span>
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#como-funciona" className="transition hover:text-white">Como funciona</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
            <Link href="/atacado" className="transition hover:text-white">Catálogo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 transition hover:text-white">
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-900/40 transition hover:opacity-90"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-medium tracking-wide text-emerald-300 uppercase">
          Compras Coletivas e Dropshipping
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          O maior ecossistema de{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
            Compras Coletivas
          </span>
          <br />
          do Brasil
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Nosso objetivo é um só: juntar o nosso poder de compra para acessar produtos direto de fábrica a preço de custo. Forme o seu estoque sem pagar mais caro por isso!
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-7 py-3.5 text-base font-bold text-black shadow-xl shadow-emerald-900/50 transition hover:scale-[1.03]"
          >
            Quero participar
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </Link>
          <Link
            href="/atacado"
            className="rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white/90 transition hover:border-emerald-400/50 hover:bg-white/5"
          >
            Ver catálogo atual
          </Link>
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 mx-auto max-w-5xl px-4 pb-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Como funciona a nossa dinâmica?</h2>
          <p className="mt-3 text-white/60">Um processo simples, transparente e feito para maximizar o seu lucro.</p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PASSO_A_PASSO.map(({ passo, titulo, descricao, icon: Icon }) => (
            <div key={passo} className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur transition hover:border-emerald-400/40 hover:bg-white/[0.04]">
              <div className="absolute -top-4 -right-4 text-6xl font-black text-white/[0.03] transition group-hover:text-emerald-500/10">
                {passo}
              </div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Icon className="size-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">{titulo}</h3>
              <p className="text-sm leading-relaxed text-white/60">{descricao}</p>
            </div>
          ))}
          
          <div className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-8 backdrop-blur sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Smartphone className="size-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Ficou com dúvida?</h3>
            <p className="text-sm leading-relaxed text-white/70">
              Em qualquer grupo de categoria, é só mandar uma mensagem que o nosso <strong>Robô Auxiliar</strong> vai te responder na hora, 24 horas por dia!
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-20">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          A união faz a força (e o lucro)
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="mb-4 text-xs font-semibold tracking-wide text-white/40 uppercase">Comprando Sozinho</p>
            <ul className="flex flex-col gap-3">
              {COMPARACAO.map((c) => (
                <li key={c.antigo} className="flex items-start gap-2 text-sm text-white/50">
                  <X className="mt-0.5 size-4 shrink-0 text-white/30" />
                  {c.antigo}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
            <p className="mb-4 text-xs font-semibold tracking-wide text-cyan-300 uppercase">Com a Comunidade {APP_NAME}</p>
            <ul className="flex flex-col gap-3">
              {COMPARACAO.map((c) => (
                <li key={c.novo} className="flex items-start gap-2 text-sm text-white/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {c.novo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Perguntas frequentes</h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.pergunta}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 open:border-emerald-400/30"
            >
              <summary className="cursor-pointer list-none font-medium text-white/90 marker:content-none">
                {item.pergunta}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-24">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-black to-black p-10 text-center shadow-2xl shadow-emerald-950/50">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Sua jornada de vendas com estoque barato começa{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              agora
            </span>
          </h2>
          <p className="max-w-md text-white/55">
            Acesse nosso painel oficial, crie sua conta e aguarde a abertura da próxima rodada nos grupos!
          </p>
          <Link
            href="/register"
            className="mt-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-base font-bold text-black shadow-xl shadow-emerald-900/50 transition hover:scale-[1.03]"
          >
            Criar minha conta grátis
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
            <div>
              <span className="flex items-center gap-1.5 text-lg font-bold">
                <Crown className="size-5 text-emerald-400" />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  {APP_NAME}
                </span>
              </span>
              <p className="mt-3 max-w-xs text-sm text-white/45">
                O maior ecossistema de compras coletivas do Brasil. Acesso a produtos direto de fábrica a preço de custo.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Produto</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
                <li><a href="#como-funciona" className="transition hover:text-white">Como funciona</a></li>
                <li><Link href="/atacado" className="transition hover:text-white">Catálogo</Link></li>
                <li><a href="#faq" className="transition hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Conta</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
                <li><Link href="/login" className="transition hover:text-white">Entrar</Link></li>
                <li><Link href="/register" className="transition hover:text-white">Criar conta</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Contato</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
                <li>{process.env.ADMIN_SEED_EMAIL ?? "contato@dropyatacado.com.br"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/35">
            © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
