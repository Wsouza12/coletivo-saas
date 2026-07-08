export const runtime = "nodejs";

import { ImageResponse } from "next/og";
import sharp from "sharp";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nome = searchParams.get("nome") || "Produto";
  const preco = searchParams.get("preco") || "0.00";
  const taxa = searchParams.get("taxa") || "0";
  const progresso = parseInt(searchParams.get("progresso") || "0", 10);
  const reservadas = searchParams.get("reservadas") || "0";
  const meta = searchParams.get("meta") || "0";
  const minimo = searchParams.get("minimo") || "1";
  const unidadesCaixa = searchParams.get("unidadesCaixa") || "1";
  const imagemSrc = searchParams.get("img"); // URL absoluta da imagem original
  const status = searchParams.get("status") || "ABERTA";

  let imgBase64: string | null = null;
  if (imagemSrc) {
    try {
      const imgRes = await fetch(imagemSrc);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        // Convert any format (WebP, PNG, etc.) to JPEG via sharp for Satori compatibility
        const jpegBuffer = await sharp(Buffer.from(buffer))
          .jpeg({ quality: 80 })
          .toBuffer();
        const b64 = jpegBuffer.toString("base64");
        imgBase64 = `data:image/jpeg;base64,${b64}`;
      }
    } catch (e) {
      console.error("Erro ao converter imagemSrc para JPEG:", e);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "#F59E0B",
            padding: "24px 28px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 700, color: "#0F172A", textAlign: "center" }}>
            {nome.toUpperCase()}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            height: 420,
            backgroundColor: "#F8FAFC",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {imgBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgBase64}
              alt={nome}
              width={600}
              height={420}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 24, color: "#64748B" }}>Sem foto</span>
          )}

          {status !== "ABERTA" && (
            <div
              style={{
                position: "absolute",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "10px solid #EF4444",
                color: "#EF4444",
                fontSize: 60,
                fontWeight: 900,
                padding: "16px 36px",
                borderRadius: 16,
                transform: "rotate(-15deg)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                boxShadow: "0 0 25px rgba(0,0,0,0.25)",
              }}
            >
              FECHADO
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "20px 28px", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                backgroundColor: "#1D9E75",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 700,
                padding: "6px 16px",
                borderRadius: 999,
              }}
            >
              {unidadesCaixa}un/caixa
            </span>
          </div>
          <span style={{ fontSize: 38, fontWeight: 800, color: "#1D9E75" }}>
            R$ {preco}/un
          </span>
          <span style={{ fontSize: 20, color: "#64748B" }}>
            Taxa de serviço {taxa}% + frete calculado no checkout
          </span>
          <div style={{ display: "flex", width: "100%", height: 16, backgroundColor: "#E2E8F0", borderRadius: 999 }}>
            <div
              style={{
                width: `${progresso}%`,
                height: "100%",
                backgroundColor: "#1D9E75",
                borderRadius: 999,
              }}
            />
          </div>
          <span style={{ fontSize: 20, color: "#64748B" }}>
            {reservadas}/{meta}un ({progresso}%) — mínimo {minimo}un
          </span>
        </div>
      </div>
    ),
    { width: 600, height: 750 }
  );
}
