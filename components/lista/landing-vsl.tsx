"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckoutLista } from "@/components/lista/checkout-lista";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

export function ListaLandingVSL({
  precoCompleta, precoCatalogos, precoUpsell, totalFornecedores, totalCatalogos,
}: {
  precoCompleta: number; precoCatalogos: number; precoUpsell: number;
  totalFornecedores: number; totalCatalogos: number;
}) {
  const [tocando, setTocando] = useState(false);
  const [urgencia, setUrgencia] = useState(false);

  function play() {
    window.fbq?.("track", "ViewContent", { content_name: "VSL Lista de Fornecedores" });
    setTocando(true);
    setTimeout(() => setUrgencia(true), 4000);
  }

  return (
    <div className="lf-root">
      {/* Meta Pixel */}
      <Script id="fb-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');fbq('init','976695258699567');fbq('track','PageView');
      `}</Script>

      {/* Login no topo, canto direito */}
      <a href="/fornecedores/entrar" className="lf-login" aria-label="Já comprou? Entrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Entrar</span>
      </a>

      <main className="wrap">
        <header className="hero">
          <span className="badge">Lista de Fornecedores</span>
          <h1>Mais de {totalFornecedores || 300} Fornecedores<span className="accent">Direto da Fonte</span></h1>
          <p className="hero-sub">A lista que reuni depois de anos vendendo em marketplace — fornecedor testado, contato direto, sem intermediário. {totalCatalogos > 0 ? `${totalCatalogos} catálogos completos inclusos.` : ""}</p>

          <div className="video-card">
            <div className="video-frame">
              {!tocando && (
                <div className="video-placeholder">
                  <div className="play-btn" role="button" aria-label="Reproduzir vídeo" onClick={play}>
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
              {tocando && (
                <div className="video-playing">
                  <p>▶ Seu vídeo (VSL) entra aqui — cole o embed do seu player.</p>
                </div>
              )}
            </div>
            {urgencia && (
              <div className="urgency">
                <div className="urgency-row">
                  <div className="urgency-text">Esse vídeo sai do ar em breve — essa é a sua chance de ver até o final.</div>
                  <div className="stop-icon"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" /></svg></div>
                </div>
                <button className="urgency-cta" onClick={() => { window.fbq?.("track", "Lead"); setUrgencia(false); }}>Continuar assistindo</button>
              </div>
            )}
          </div>

          <div className="cta-wrap">
            <a href="#checkout" className="cta-btn" onClick={() => window.fbq?.("track", "Lead")}>Comprar agora →</a>
          </div>
        </header>

        <section className="testimonial">
          <div className="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" /></svg>
          </div>
          <h2>Pablo Wanderson</h2>
          <p>Depois de anos vendendo no Mercado Livre e na Shopee, decidi reunir num só lugar os fornecedores que realmente entregam — pra quem tá começando não perder tempo nem dinheiro com fornecedor fantasma.</p>
        </section>

        <section className="benefits">
          <h2 className="benefits-title">Por que essa lista vale ouro</h2>
          <div className="benefits-grid">
            {[
              { t: "Fornecedor testado", d: "Nada de fornecedor fantasma — só quem realmente entrega." },
              { t: "Contato direto", d: "Telefone, WhatsApp e endereço de cada um. Fale direto, sem intermediário." },
              { t: "Catálogos completos", d: "Baixe os PDFs com todos os produtos e preços de atacado." },
              { t: "Preço de fábrica", d: "Compre na fonte e aumente sua margem no ML e na Shopee." },
              { t: "Sempre atualizada", d: "Novos fornecedores entram e você recebe sem pagar de novo." },
              { t: "Acesso na hora", d: "Pagou o Pix, entrou. Login pelo seu CPF, quando quiser." },
            ].map((b) => (
              <div key={b.t} className="benefit">
                <span className="benefit-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                <div><p className="benefit-t">{b.t}</p><p className="benefit-d">{b.d}</p></div>
              </div>
            ))}
          </div>
          <div className="cta-wrap" style={{ marginBottom: 8 }}>
            <a href="#checkout" className="cta-btn" onClick={() => window.fbq?.("track", "Lead")}>Quero minha lista agora →</a>
          </div>
        </section>

        <section id="checkout" className="checkout-sec">
          <h2 className="checkout-title">Garanta seu acesso agora</h2>
          <CheckoutLista precoCompleta={precoCompleta} precoCatalogos={precoCatalogos} precoUpsell={precoUpsell} />
          <p className="checkout-note">Pagamento único via Pix. Acesso liberado na hora com seu CPF.</p>
        </section>
      </main>

      <footer className="lf-footer">
        <p>© 2026 Pablo Wanderson. Todos os direitos reservados.</p>
      </footer>

      <style jsx global>{`
        .lf-root{
          --bg:#0B0906; --orange:#F5A524; --orange-2:#FF8A1E; --green:#22C55E; --green-dark:#16A34A;
          --text:#F5F1EA; --muted:#B7AFA2; --line:rgba(245,241,234,0.10); --red:#E5484D;
          position:relative; min-height:100vh; background:var(--bg); color:var(--text);
          font-family:'Inter',system-ui,sans-serif; line-height:1.5;
          background-image:linear-gradient(rgba(245,165,36,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(245,165,36,0.05) 1px,transparent 1px);
          background-size:42px 42px;
        }
        .lf-root .wrap{max-width:720px; margin:0 auto; padding:0 24px;}
        .lf-root .hero{padding:56px 0 40px; text-align:center;}
        .lf-root .badge{display:inline-block; border:1px solid var(--orange); color:var(--orange); font-size:12.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:8px 18px; border-radius:999px; margin-bottom:26px; background:rgba(245,165,36,0.06);}
        .lf-root h1{font-size:clamp(30px,6.2vw,44px); font-weight:800; line-height:1.12; margin-bottom:20px;}
        .lf-root h1 .accent{color:var(--orange-2); display:block;}
        .lf-root .hero-sub{color:var(--muted); font-size:16px; max-width:520px; margin:0 auto 36px;}
        .lf-root .video-card{position:relative; border-radius:18px; overflow:hidden; border:1px solid var(--line); background:#000; aspect-ratio:16/10; margin-bottom:28px;}
        .lf-root .video-frame{position:absolute; inset:0;}
        .lf-root .video-placeholder{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#14100a,#0a0704);}
        .lf-root .video-playing{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; color:var(--muted); font-size:14px;}
        .lf-root .play-btn{width:64px; height:64px; border-radius:50%; background:var(--orange-2); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 0 8px rgba(255,138,30,0.14);}
        .lf-root .play-btn svg{width:22px; height:22px; fill:#0B0906; margin-left:3px;}
        .lf-root .urgency{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; text-align:center; padding:20px; background:linear-gradient(180deg,rgba(10,7,4,0.35),rgba(10,7,4,0.85));}
        .lf-root .urgency-row{display:flex; align-items:center; gap:16px; justify-content:center;}
        .lf-root .urgency-text{font-weight:700; font-size:15px; max-width:320px; text-align:left; line-height:1.35;}
        .lf-root .stop-icon{flex:0 0 auto; width:52px; height:52px; background:var(--red); clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%); display:flex; align-items:center; justify-content:center;}
        .lf-root .stop-icon svg{width:24px; height:24px;}
        .lf-root .urgency-cta{display:inline-flex; align-items:center; gap:8px; background:var(--orange-2); color:#1a0f00; font-weight:800; text-transform:uppercase; font-size:14px; padding:13px 22px; border-radius:8px; border:none; cursor:pointer;}
        .lf-root .cta-btn{display:inline-flex; align-items:center; gap:10px; justify-content:center; background:var(--green); color:#08150C; font-weight:800; text-transform:uppercase; font-size:16px; padding:17px 34px; border-radius:10px; border:none; cursor:pointer; text-decoration:none; width:100%; max-width:420px; margin:0 auto; transition:background .15s ease,transform .1s ease;}
        .lf-root .cta-btn:hover{background:var(--green-dark); transform:translateY(-1px);}
        .lf-root .cta-wrap{display:flex; justify-content:center; margin-bottom:64px;}
        .lf-root .testimonial{padding:24px 0 48px; text-align:center;}
        .lf-root .avatar{width:170px; height:210px; margin:0 auto 26px; border-radius:16px; border:2px solid var(--orange); overflow:hidden; box-shadow:0 0 26px rgba(245,165,36,0.18); display:flex; align-items:center; justify-content:center; background:#1b1610;}
        .lf-root .avatar svg{width:64%; height:64%; fill:#4a3f30;}
        .lf-root .testimonial h2{font-size:26px; font-weight:800; margin-bottom:14px;}
        .lf-root .testimonial p{color:var(--muted); font-size:14.5px; max-width:440px; margin:0 auto; line-height:1.6;}
        .lf-root .benefits{padding:8px 0 48px;}
        .lf-root .benefits-title{text-align:center; font-size:24px; font-weight:800; margin-bottom:24px;}
        .lf-root .benefits-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:32px;}
        .lf-root .benefit{display:flex; gap:12px; align-items:flex-start; border:1px solid var(--line); background:var(--bg-2,#141009); border-radius:14px; padding:16px;}
        .lf-root .benefit-ic{flex:0 0 auto; width:30px; height:30px; border-radius:8px; background:rgba(34,197,94,0.14); color:var(--green); display:flex; align-items:center; justify-content:center;}
        .lf-root .benefit-ic svg{width:16px; height:16px;}
        .lf-root .benefit-t{font-weight:700; font-size:14.5px; margin-bottom:3px;}
        .lf-root .benefit-d{color:var(--muted); font-size:13px; line-height:1.45;}
        @media (max-width:560px){ .lf-root .benefits-grid{grid-template-columns:1fr;} }
        .lf-root .checkout-sec{padding:8px 0 56px; scroll-margin-top:20px;}
        .lf-root .checkout-title{text-align:center; font-size:24px; font-weight:800; margin-bottom:20px;}
        .lf-root .checkout-note{text-align:center; color:rgba(245,241,234,0.45); font-size:12.5px; margin-top:14px;}
        .lf-root .lf-login{position:absolute; top:16px; right:16px; z-index:20; display:inline-flex; align-items:center; gap:7px; border:1px solid var(--line); background:rgba(20,16,9,0.7); backdrop-filter:blur(6px); color:var(--text); font-size:13px; font-weight:600; padding:8px 14px; border-radius:999px; text-decoration:none; transition:border-color .15s ease,background .15s ease;}
        .lf-root .lf-login:hover{border-color:var(--orange); background:rgba(245,165,36,0.12); color:var(--orange);}
        .lf-root .lf-login svg{width:16px; height:16px;}
        @media (max-width:480px){ .lf-root .lf-login span{display:none;} .lf-root .lf-login{padding:9px;} }
        .lf-root .lf-footer{border-top:1px solid var(--line); padding:26px 0; text-align:center;}
        .lf-root .lf-footer p{color:rgba(245,241,234,0.4); font-size:12.5px;}
      `}</style>
    </div>
  );
}
