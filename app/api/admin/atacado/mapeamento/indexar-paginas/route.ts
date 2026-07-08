import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { embedImagem, embedTexto, formatarVetor } from "@/lib/jina";
import { uploadCropImagem } from "@/lib/storage";

const schema = z.object({
  catalogoId: z.string().min(1),
  paginas: z.array(z.object({
    pagina: z.number().int().positive(),
    texto: z.string(),
    thumbBase64: z.string().optional(),
    crops: z.array(z.object({
      cropIndex: z.number().int().min(0),
      base64: z.string(),
    })).optional(),
  })).min(1).max(10),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });

  const { catalogoId, paginas } = parsed.data;
  const jinaKey = process.env.JINA_API_KEY;

  await Promise.all(
    paginas.map(async ({ pagina, texto, thumbBase64, crops }) => {
      // Upsert texto da página
      await prisma.mapaCatalogoPagina.upsert({
        where: { catalogoId_pagina: { catalogoId, pagina } },
        create: { catalogoId, pagina, textoOcr: texto },
        update: { textoOcr: texto, indexadoEm: new Date() },
      });

      if (!jinaKey) return;

      // Se há crops: gera embedding por recorte individual em duplas (2 paralelas = ~2-3s/par)
      if (crops && crops.length > 0) {
        let cropsSalvos = 0;
        // Processa 2 crops por vez para equilibrar velocidade e rate limit da Jina
        for (let ci = 0; ci < crops.length; ci += 2) {
          const par = crops.slice(ci, ci + 2).filter((c) => c.base64 && c.base64.length > 100);
          await Promise.all(par.map(async ({ cropIndex, base64 }) => {
            const id = `${catalogoId}_p${pagina}_c${cropIndex}`;
            try {
              // INSERT primeiro — garante registro mesmo se Jina falhar
              await prisma.$executeRawUnsafe(
                `INSERT INTO "MapaCatalogoCrop" ("id","catalogoId","pagina","cropIndex","indexadoEm")
                 VALUES ($1,$2,$3,$4,now())
                 ON CONFLICT ("catalogoId","pagina","cropIndex")
                 DO UPDATE SET "indexadoEm" = now()`,
                id, catalogoId, pagina, cropIndex,
              );
              // Salva a imagem do recorte no storage (para exibir no card)
              try {
                const imagemUrl = await uploadCropImagem(base64, id);
                await prisma.$executeRawUnsafe(
                  `UPDATE "MapaCatalogoCrop" SET "imagemUrl" = $1 WHERE id = $2`,
                  imagemUrl, id,
                );
              } catch (imgErr) {
                console.error(`Upload crop img pág${pagina} crop${cropIndex}:`, imgErr);
              }
              const embedding = await embedImagem(base64, "image/jpeg");
              await prisma.$executeRawUnsafe(
                `UPDATE "MapaCatalogoCrop" SET embedding = $1::vector WHERE id = $2`,
                formatarVetor(embedding), id,
              );
              cropsSalvos++;
            } catch (e) {
              console.error(`Crop pág${pagina} crop${cropIndex}:`, e);
            }
          }));
        }
        console.log(`Pág ${pagina}: ${cropsSalvos}/${crops.length} crops salvos`);
        return; // crops concluídos — pula embedding de página inteira
      }

      // Fallback para catálogos sem reindexação por crop
      let embedding: number[] | undefined;
      try {
        if (thumbBase64 && thumbBase64.length > 100) {
          embedding = await embedImagem(thumbBase64, "image/jpeg");
        } else if (texto.length > 10) {
          embedding = await embedTexto(texto.substring(0, 1000));
        }
      } catch (e) {
        console.error(`Embedding pág ${pagina}:`, e);
        return;
      }

      if (embedding) {
        await prisma.$executeRawUnsafe(
          `UPDATE "MapaCatalogoPagina" SET embedding = $1::vector WHERE "catalogoId" = $2 AND pagina = $3`,
          formatarVetor(embedding),
          catalogoId,
          pagina,
        );
      }
    })
  );

  return NextResponse.json({ data: { ok: true, salvas: paginas.length } });
}
