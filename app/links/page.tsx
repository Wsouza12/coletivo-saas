export default function LinksPage() {
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'DM Sans', sans-serif !important;
            background-color: #0c0b08 !important;
            color: #f5f0e0 !important;
            min-height: 100vh !important;
        }

        .c-image-bio {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
        }

        .c-image-bio::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 70% 55% at 15% 5%,  rgba(255, 210, 60, 0.20) 0%, transparent 60%),
                radial-gradient(ellipse 55% 65% at 85% 85%, rgba(200, 140, 20, 0.18) 0%, transparent 55%),
                radial-gradient(ellipse 45% 45% at 50% 45%, rgba(255, 180, 30, 0.10) 0%, transparent 50%),
                linear-gradient(160deg, #100f08 0%, #0c0b08 50%, #110e06 100%);
            z-index: 0;
            pointer-events: none;
        }

        .c-image-bio::after {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            opacity: 0.03;
            pointer-events: none;
            z-index: 1;
        }

        .bg-grid {
            position: fixed;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background-image:
                linear-gradient(rgba(255,210,40,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,210,40,0.15) 1px, transparent 1px);
            background-size: 60px 60px;
        }

        .comet {
            position: fixed;
            bottom: -160px;
            width: 2px;
            height: 120px;
            border-radius: 999px;
            background: linear-gradient(to top, rgba(255,220,80,0.9), rgba(255,180,30,0.4), transparent);
            box-shadow: 0 0 6px 1px rgba(255,220,80,0.35);
            pointer-events: none;
            z-index: 2;
            animation: cometRise linear infinite;
        }
        .comet::after {
            content: '';
            position: absolute;
            top: 0; left: 50%;
            transform: translateX(-50%);
            width: 5px; height: 5px;
            border-radius: 50%;
            background: rgba(255,240,140,0.95);
            box-shadow: 0 0 10px 3px rgba(255,220,80,0.7);
        }
        .comet:nth-child(1)  { left: 8%;   height: 100px; animation-duration: 3.2s; animation-delay: 0s;    opacity: 0.85; }
        .comet:nth-child(2)  { left: 18%;  height: 140px; animation-duration: 4.5s; animation-delay: 1.3s;  opacity: 0.65; }
        .comet:nth-child(3)  { left: 31%;  height: 90px;  animation-duration: 2.8s; animation-delay: 0.6s;  opacity: 0.75; }
        .comet:nth-child(4)  { left: 44%;  height: 160px; animation-duration: 5.1s; animation-delay: 2.1s;  opacity: 0.55; }
        .comet:nth-child(5)  { left: 57%;  height: 110px; animation-duration: 3.7s; animation-delay: 0.9s;  opacity: 0.80; }
        .comet:nth-child(6)  { left: 68%;  height: 130px; animation-duration: 4.2s; animation-delay: 3.4s;  opacity: 0.60; }
        .comet:nth-child(7)  { left: 78%;  height: 80px;  animation-duration: 2.5s; animation-delay: 1.7s;  opacity: 0.70; }
        .comet:nth-child(8)  { left: 88%;  height: 150px; animation-duration: 4.8s; animation-delay: 0.3s;  opacity: 0.50; }
        @keyframes cometRise {
            0%   { transform: translateY(0);     opacity: 0; }
            5%   { opacity: 1; }
            90%  { opacity: 0.6; }
            100% { transform: translateY(-110vh); opacity: 0; }
        }

        .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            pointer-events: none;
            z-index: 0;
            animation: drift 12s ease-in-out infinite alternate;
        }
        .orb-1 {
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(255,210,40,0.12) 0%, transparent 70%);
            top: -120px; left: -100px;
            animation-duration: 14s;
        }
        .orb-2 {
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(200,130,10,0.14) 0%, transparent 70%);
            bottom: -80px; right: -80px;
            animation-duration: 18s;
            animation-delay: -6s;
        }
        .orb-3 {
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(255,190,20,0.08) 0%, transparent 70%);
            top: 40%; left: 60%;
            animation-duration: 22s;
            animation-delay: -10s;
        }
        @keyframes drift {
            from { transform: translate(0, 0) scale(1); }
            to   { transform: translate(40px, 30px) scale(1.08); }
        }

        .links-container {
            position: relative;
            z-index: 2;
            max-width: 860px;
            margin: 0 auto;
            padding: 60px 24px 80px;
        }

        .brand-logo {
            display: inline-block;
            filter: drop-shadow(0 0 28px rgba(255,210,40,0.4));
            transition: transform 0.4s ease, filter 0.4s ease;
            animation: fadeDown 0.7s ease both;
        }
        .brand-logo:hover {
            transform: scale(1.05);
            filter: drop-shadow(0 0 44px rgba(255,210,40,0.65));
        }

        .page-heading {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: clamp(2rem, 5vw, 3.2rem);
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #fff 20%, #ffd230 60%, #c8860a 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-top: 2rem;
            animation: fadeUp 0.7s 0.15s ease both;
        }

        .divider {
            height: 1px;
            width: 200px;
            margin: 1rem auto;
            background: linear-gradient(90deg, transparent, rgba(255,210,40,0.6), transparent);
            border: none;
            animation: fadeUp 0.7s 0.25s ease both;
        }

        .page-subtitle {
            color: rgba(245,240,224,0.5);
            font-size: 0.95rem;
            max-width: 380px;
            margin: 0 auto;
            animation: fadeUp 0.7s 0.35s ease both;
        }

        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 2rem;
        }

        .link-card {
            display: block;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            text-decoration: none;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,210,40,0.10);
            box-shadow:
                0 4px 28px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,210,40,0.08);
            transition: transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s ease, border-color 0.35s ease;
            opacity: 0;
            transform: translateY(32px);
            animation: cardIn 0.6s ease forwards;
        }
        .link-card:nth-child(1) { animation-delay: 0.05s; }
        .link-card:nth-child(2) { animation-delay: 0.15s; }
        .link-card:nth-child(3) { animation-delay: 0.25s; }
        .link-card:nth-child(4) { animation-delay: 0.35s; }
        .link-card:nth-child(5) { animation-delay: 0.45s; }

        .link-card::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(160deg, rgba(255,210,40,0.09) 0%, transparent 55%);
            opacity: 0;
            transition: opacity 0.35s ease;
        }
        .link-card:hover {
            transform: translateY(-7px) scale(1.015);
            box-shadow:
                0 20px 55px rgba(0,0,0,0.5),
                0 0 0 1px rgba(255,210,40,0.35),
                0 0 40px rgba(255,210,40,0.08),
                inset 0 1px 0 rgba(255,210,40,0.15);
            border-color: rgba(255,210,40,0.3);
        }
        .link-card:hover::after { opacity: 1; }

        .link-card img {
            display: block;
            width: 100%;
            height: auto;
            transition: transform 0.5s cubic-bezier(.22,1,.36,1), filter 0.4s ease;
            filter: brightness(0.9) saturate(1.05);
        }
        .link-card:hover img {
            transform: scale(1.05);
            filter: brightness(1.02) saturate(1.18);
        }

        .shine {
            position: absolute;
            top: 0; left: -80%;
            width: 50%;
            height: 100%;
            background: linear-gradient(120deg, transparent 0%, rgba(255,220,80,0.08) 50%, transparent 100%);
            transform: skewX(-20deg);
            transition: left 0.65s ease;
            pointer-events: none;
            z-index: 3;
        }
        .link-card:hover .shine { left: 160%; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
            from { opacity: 0; transform: translateY(-16px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 576px) {
            .links-grid { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>
      
      <main className="c-image-bio">
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        <div className="comet"></div>
        
        <div className="bg-grid"></div>
        
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <section className="links-container">
          <div className="text-center">
            <a href="/" className="brand-logo">
              <img width="150" src="https://app.lucasecom.com.br/assets/imgs/logo_ecom.png" alt="Marketplace na Veia" />
            </a>
            <h1 className="page-heading">Seja bem-vindo(a)!</h1>
            <hr className="divider" />
            <p className="page-subtitle">
              Veja os links importantes da nossa plataforma abaixo e clique nas imagens para acessar os conteúdos!
            </p>
          </div>
          
          <div className="links-grid">
            <a className="link-card" href="https://lucasecom.com.br/quiz-mvo-1">
              <div className="shine"></div>
              <img
                title="Combo 2 em 1 - Mercado Livre e Shopee. Treinamento completo"
                alt="Combo 2 em 1 - Mercado Livre e Shopee. Treinamento completo"
                loading="lazy"
                src="https://marketplacenaveia.com/storage/biolinks/Xp6v79Lwz9WSklW6iB6iicSZKugTRqr9opzsQVR9.png"
              />
            </a>
            <a className="link-card" href="https://lucasecom.com.br/pack-botao-inicio/">
              <div className="shine"></div>
              <img
                title="Lista de fornecedores - Marketplace na Veia"
                alt="Lista de fornecedores - Marketplace na Veia"
                loading="lazy"
                src="https://app.lucasecom.com.br/storage/biolinks/BvUjVTDyjrs6SPYTShVlAKKPGJ05Z5EtH6pw46qF.png"
              />
            </a>
            <a className="link-card" href="https://sellernaveia.marketplacenaveia.com/">
              <div className="shine"></div>
              <img
                title="Seller NaVeia"
                alt="Seller NaVeia"
                loading="lazy"
                src="https://app.lucasecom.com.br/storage/biolinks/WMlqmEJGUr7ikTNGUiHyYGvp9XBUac9D9cfhV3q5.png"
              />
            </a>
            <a className="link-card" href="https://tiny.com.br/ads/sistema-de-gestao?parceiro=Impellizieri">
              <div className="shine"></div>
              <img
                title="Tiny ERP - Teste de 30 dias"
                alt="Tiny ERP - Teste de 30 dias"
                loading="lazy"
                src="https://app.lucasecom.com.br/storage/biolinks/rKOn8TZ867yg0ySWDvN9q10Uyo3zMIeCsnIT3RGg.png"
              />
            </a>
            <a className="link-card" href="https://wa.me/5522992687704">
              <div className="shine"></div>
              <img
                title="Fale no WhatsApp"
                alt="Fale no WhatsApp"
                loading="lazy"
                src="https://marketplacenaveia.com/storage/biolinks/O0Xzb7G9cPGy3tI1ZuP8mI9MuU4Y5Ihjo3Lom5yX.png" // Reusing an image from their HTML for the 5th item, since it says Mentoria, but they want it to go to whatsapp or something? Actually let's just use the exact HTML they provided
              />
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
