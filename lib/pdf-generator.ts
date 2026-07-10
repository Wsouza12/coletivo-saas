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
  esgotado?: boolean;
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

export async function gerarCatalogoPdf(produtos: ProdutoCatalogoPDF[], customLogoBase64?: string): Promise<File> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const colWidth = (pageWidth - margin * 3) / 2;
  const rowHeight = (pageHeight - margin * 3 - 30) / 2; // 30mm for header
  
  let currentX = margin;
  let currentY = margin + 30; // start below header
  
  function drawHeader(page: number, total: number) {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 25, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CATÁLOGO PRONTA ENTREGA", margin, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString("pt-BR");
    doc.text(`Atualizado em ${dateStr} - Pág ${page}/${total}`, pageWidth - margin, 16, { align: "right" });
  }

  const itemsPerPage = 4;
  const contentPages = Math.ceil(produtos.length / itemsPerPage) || 1;
  const totalPages = contentPages + 1; // Capa + Conteúdo

  // --- CAPA (Página 1) ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  try {
    let base64Logo = customLogoBase64;
    if (!base64Logo) {
      const logoUrl = window.location.origin + "/logo-jn.png.jpeg";
      base64Logo = await getBase64ImageFromUrl(logoUrl);
    }
    
    // Logo centralizada (width = 80px, height = 80px)
    const logoSize = 80;
    doc.addImage(base64Logo, "JPEG", (pageWidth - logoSize) / 2, pageHeight / 2 - 70, logoSize, logoSize);
  } catch (e) {
    console.error("Erro ao carregar logo para a capa", e);
  }
  
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("CATÁLOGO", pageWidth / 2, pageHeight / 2 + 30, { align: "center" });
  
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(24);
  doc.text("PRONTA ENTREGA", pageWidth / 2, pageHeight / 2 + 45, { align: "center" });
  
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Todos os produtos aqui listados estão disponíveis para envio imediato.", pageWidth / 2, pageHeight / 2 + 58, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Atualizado em ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, pageHeight / 2 + 70, { align: "center" });

  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    const pageIndex = Math.floor(i / itemsPerPage);
    const itemIndexOnPage = i % itemsPerPage;
    const row = Math.floor(itemIndexOnPage / 2);
    const col = itemIndexOnPage % 2;

    if (itemIndexOnPage === 0) {
      doc.addPage();
      drawHeader(pageIndex + 2, totalPages); // +2 pq a capa é a pág 1
    }

    currentX = margin + col * (colWidth + margin);
    currentY = margin + 30 + row * (rowHeight + margin);

    // Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(currentX, currentY, colWidth, rowHeight, 3, 3, "FD");

    // Imagem (se houver)
    const imgSize = 75;
    const imgX = currentX + (colWidth - imgSize) / 2;
    let imgY = currentY + 3;

    if (p.imagemUrl) {
      try {
        const base64Img = await getBase64ImageFromUrl(p.imagemUrl);
        doc.addImage(base64Img, "JPEG", imgX, imgY, imgSize, imgSize);
      } catch (e) {
        console.error("Erro ao baixar imagem", p.imagemUrl, e);
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
    let textY = imgY + imgSize + 8;
    
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    const maxTitleLen = 42;
    let title = p.nome.toUpperCase();
    if (title.length > maxTitleLen) title = title.substring(0, maxTitleLen) + "...";
    
    // Escrever o texto com quebra de linha se for muito longo
    const textLines = doc.splitTextToSize(title, colWidth - 10);
    doc.text(textLines, currentX + colWidth / 2, textY, { align: "center" });
    textY += (textLines.length * 6) + 2;

    // Código e Caixa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`CÓD: ${p.codigo || "S/CÓD"}  •  CX: ${p.unidadesPorCaixa} un`, currentX + colWidth / 2, textY, { align: "center" });
    textY += 10;

    // Preços
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(formatBRL(p.custoUnitario), currentX + colWidth / 2, textY, { align: "center" });
    
    if (p.precoVendaSugerido) {
      textY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Sugestão revenda: ${formatBRL(p.precoVendaSugerido)}`, currentX + colWidth / 2, textY, { align: "center" });
    }

    // Carimbo de Esgotado
    if (p.esgotado) {
      doc.setDrawColor(220, 38, 38); // red-600
      doc.setFillColor(254, 226, 226); // red-100
      doc.setLineWidth(1.5);
      doc.rect(currentX + (colWidth - 50) / 2, imgY + (imgSize - 15) / 2, 50, 15, "FD");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text("ESGOTADO", currentX + colWidth / 2, imgY + (imgSize - 15) / 2 + 10.5, { align: "center" });
    }
  }

  // Caso não haja produtos
  if (produtos.length === 0) {
    doc.addPage();
    drawHeader(2, 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Nenhum produto cadastrado no Estoque Próprio ainda.", pageWidth / 2, pageHeight / 2, { align: "center" });
  }

  const pdfBlob = doc.output("blob");
  const fileName = `catalogo-estoque-${new Date().toISOString().slice(0,10)}.pdf`;
  return new File([pdfBlob], fileName, { type: "application/pdf" });
}
