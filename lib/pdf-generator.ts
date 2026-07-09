import jsPDF from "jspdf";
import { formatBRL } from "@/lib/format";

// Precisamos do tipo de produto retornado pela API
export type ProdutoCatalogoPDF = {
  codigo?: string | null;
  nome: string;
  imagemUrl?: string | null;
  custoUnitario: number;
  precoCatalogo?: number | null;
  precoVendaSugerido?: number | null;
  unidadesPorCaixa: number;
  categoria?: string;
};

function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Failed to get canvas context"));
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataURL);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = imageUrl;
  });
}

export async function gerarCatalogoPdf(produtos: ProdutoCatalogoPDF[]): Promise<File> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const colWidth = (pageWidth - margin * 3) / 2;
  const rowHeight = (pageHeight - margin * 4 - 30) / 3; // 30mm for header
  
  let currentX = margin;
  let currentY = margin + 30; // start below header
  
  function drawHeader(page: number, total: number) {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 25, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CATÁLOGO DE ESTOQUE PRÓPRIO", margin, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString("pt-BR");
    doc.text(`Atualizado em ${dateStr} - Pág ${page}/${total}`, pageWidth - margin, 16, { align: "right" });
  }

  const itemsPerPage = 6;
  const totalPages = Math.ceil(produtos.length / itemsPerPage) || 1;

  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    const pageIndex = Math.floor(i / itemsPerPage);
    const itemIndexOnPage = i % itemsPerPage;
    const row = Math.floor(itemIndexOnPage / 2);
    const col = itemIndexOnPage % 2;

    if (itemIndexOnPage === 0) {
      if (i > 0) doc.addPage();
      drawHeader(pageIndex + 1, totalPages);
    }

    currentX = margin + col * (colWidth + margin);
    currentY = margin + 30 + row * (rowHeight + margin);

    // Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(currentX, currentY, colWidth, rowHeight, 3, 3, "FD");

    // Imagem (se houver)
    const imgSize = 50;
    const imgX = currentX + (colWidth - imgSize) / 2;
    let imgY = currentY + 5;

    if (p.imagemUrl) {
      try {
        const base64Img = await getBase64ImageFromUrl(p.imagemUrl);
        doc.addImage(base64Img, "JPEG", imgX, imgY, imgSize, imgSize);
      } catch (e) {
        console.error("Erro ao baixar imagem", p.imagemUrl, e);
        // Fallback rect
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX, imgY, imgSize, imgSize);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Sem foto", imgX + imgSize/2, imgY + imgSize/2, { align: "center" });
      }
    } else {
      doc.setDrawColor(220, 220, 220);
      doc.rect(imgX, imgY, imgSize, imgSize);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Sem foto", imgX + imgSize/2, imgY + imgSize/2, { align: "center" });
    }

    // Informações textuais
    let textY = imgY + imgSize + 6;
    
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    
    // Limita o nome para não estourar
    const maxTitleLen = 45;
    let title = p.nome;
    if (title.length > maxTitleLen) title = title.substring(0, maxTitleLen) + "...";
    doc.text(title, currentX + colWidth / 2, textY, { align: "center" });
    textY += 5;

    // Código
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`CÓD: ${p.codigo || "S/CÓD"} | CX: ${p.unidadesPorCaixa} un`, currentX + colWidth / 2, textY, { align: "center" });
    textY += 8;

    // Preços
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(formatBRL(p.custoUnitario), currentX + 5, textY);
    
    if (p.precoVendaSugerido) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Sugestão: ${formatBRL(p.precoVendaSugerido)}`, currentX + colWidth - 5, textY, { align: "right" });
    }
  }

  // Caso não haja produtos
  if (produtos.length === 0) {
    drawHeader(1, 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Nenhum produto cadastrado no Estoque Próprio ainda.", pageWidth / 2, pageHeight / 2, { align: "center" });
  }

  const pdfBlob = doc.output("blob");
  const fileName = `catalogo-estoque-${new Date().toISOString().slice(0,10)}.pdf`;
  return new File([pdfBlob], fileName, { type: "application/pdf" });
}
