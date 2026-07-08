import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nome = searchParams.get("nome") ?? "Produto";
  const preco = searchParams.get("preco") ?? "";
  const precoAnterior = searchParams.get("precoAnterior") ?? "";
  const fotoUrl = searchParams.get("fotoUrl") ?? "";
  const featuresStr = searchParams.get("features") ?? "";
  const features = featuresStr ? featuresStr.split("|").filter(Boolean).slice(0, 4) : [];
  const formato = searchParams.get("formato") ?? "POST";
  const cor = searchParams.get("cor") ?? "#CC0000";
  const handle = searchParams.get("handle") ?? "@jn_comprascoletivas";
  const badge = searchParams.get("badge") ?? "NOVIDADE!";

  const isVertical = formato !== "POST";
  const W = 1080;
  const H = isVertical ? 1920 : 1080;

  const corEscura = "#1a0000";

  const template = isVertical ? (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(160deg, #0d0d0d 0%, #1a0a0a 40%, #0a0a1a 100%)`,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Orb decorativo */}
      <div style={{
        position: "absolute", width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, ${cor}55 0%, transparent 70%)`,
        top: -200, right: -200, display: "flex",
      }} />
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${cor}33 0%, transparent 70%)`,
        bottom: 200, left: -300, display: "flex",
      }} />

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "60px 70px 0" }}>
        <div style={{
          background: cor, color: "white", fontSize: 42, fontWeight: 900,
          padding: "14px 36px", borderRadius: 10, letterSpacing: 3, display: "flex",
        }}>
          {badge}
        </div>
        <div style={{ color: "white", fontSize: 34, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ color: "#ffffff" }}>JN COMPRAS</span>
          <span style={{ color: cor }}>COLETIVAS</span>
        </div>
      </div>

      {/* Nome do produto */}
      <div style={{ padding: "50px 70px 20px", display: "flex" }}>
        <span style={{
          color: "white", fontSize: nome.length > 25 ? 72 : 88,
          fontWeight: 900, lineHeight: 1.05, textTransform: "uppercase",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          {nome}
        </span>
      </div>

      {/* Foto do produto */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        flex: 1, padding: "0 70px", position: "relative",
      }}>
        {fotoUrl ? (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            width: 800, height: 700,
            background: "rgba(255,255,255,0.05)", borderRadius: 32,
            border: `2px solid ${cor}55`,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl} style={{ maxWidth: 720, maxHeight: 640, objectFit: "contain" }} alt="" />
          </div>
        ) : (
          <div style={{
            width: 800, height: 700, background: "rgba(255,255,255,0.05)",
            borderRadius: 32, border: `2px dashed ${cor}55`, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: `${cor}88`, fontSize: 48 }}>📦</span>
          </div>
        )}
      </div>

      {/* Preço */}
      <div style={{ padding: "40px 70px 20px", display: "flex", alignItems: "flex-end", gap: 50 }}>
        {precoAnterior && (
          <div style={{ display: "flex", flexDirection: "column", color: "#888" }}>
            <span style={{ fontSize: 36 }}>DE:</span>
            <span style={{ fontSize: 56, textDecoration: "line-through" }}>R$ {precoAnterior}</span>
          </div>
        )}
        {preco && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 36, color: cor, fontWeight: 700 }}>POR APENAS:</span>
            <span style={{ fontSize: 120, fontWeight: 900, color: "white", lineHeight: 1 }}>R$ {preco}</span>
          </div>
        )}
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div style={{ padding: "0 70px 40px", display: "flex", flexWrap: "wrap", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "rgba(255,255,255,0.08)", borderRadius: 12,
              padding: "16px 24px", border: `1px solid ${cor}44`,
            }}>
              <span style={{ color: cor, fontSize: 32, fontWeight: 900 }}>✓</span>
              <span style={{ color: "white", fontSize: 32 }}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        background: cor, padding: "32px 70px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "white", fontSize: 36, fontWeight: 900 }}>🛒 COMPRE AGORA</span>
        <span style={{ color: "white", fontSize: 30, opacity: 0.9 }}>{handle}</span>
      </div>
    </div>
  ) : (
    // POST — 1080x1080
    <div
      style={{
        width: W, height: H,
        display: "flex",
        background: "linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 50%, #0a0a1a 100%)",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Orb */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${cor}55 0%, transparent 70%)`,
        top: -200, right: -200, display: "flex",
      }} />

      {/* Esquerda: texto */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        width: fotoUrl ? "52%" : "100%", padding: "56px 0 0 60px",
      }}>
        {/* Badge */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            background: cor, color: "white", fontSize: 32, fontWeight: 900,
            padding: "10px 28px", borderRadius: 8, letterSpacing: 3,
            display: "flex", alignSelf: "flex-start",
          }}>
            {badge}
          </div>

          <span style={{
            color: "white", fontSize: nome.length > 20 ? 54 : 66,
            fontWeight: 900, lineHeight: 1.05, textTransform: "uppercase",
          }}>
            {nome}
          </span>

          {/* Preço */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
            {precoAnterior && (
              <span style={{ color: "#888", fontSize: 36, textDecoration: "line-through" }}>R$ {precoAnterior}</span>
            )}
            {preco && (
              <>
                <span style={{ color: cor, fontSize: 26, fontWeight: 700 }}>POR APENAS</span>
                <span style={{ color: "white", fontSize: 86, fontWeight: 900, lineHeight: 1 }}>R$ {preco}</span>
              </>
            )}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            {features.slice(0, 3).map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  background: cor, color: "white", borderRadius: "50%",
                  width: 32, height: 32, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, fontWeight: 900, flexShrink: 0,
                }}>✓</span>
                <span style={{ color: "white", fontSize: 28 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer brand */}
        <div style={{
          background: cor, padding: "20px 28px", marginLeft: -60, marginRight: 0,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{ color: "white", fontSize: 26, fontWeight: 900 }}>JN COMPRAS COLETIVAS</span>
          <span style={{ color: "white", fontSize: 22, opacity: 0.85 }}>{handle}</span>
        </div>
      </div>

      {/* Direita: foto */}
      {fotoUrl && (
        <div style={{
          width: "48%", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 40px 40px 0",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 28,
            border: `2px solid ${cor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", height: "100%",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} alt="" />
          </div>
        </div>
      )}
    </div>
  );

  return new ImageResponse(template, { width: W, height: H });
}
