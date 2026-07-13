import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type CardSize = 'us' | 'eu';

const CARD_SIZES: Record<CardSize, [number, number]> = {
  us: [88.9, 50.8],
  eu: [85, 55],
};

export function useExportPDF() {
  const exportAsPDF = async (
    elementId: string,
    filename: string = 'DevCard.pdf',
    size: CardSize = 'us'
  ) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#0f1222',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const [w, h] = CARD_SIZES[size];

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [w, h],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save(filename);
  };

  return { exportAsPDF };
}