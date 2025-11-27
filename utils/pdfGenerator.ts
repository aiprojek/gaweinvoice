import { jsPDF } from 'jspdf';

// html-to-image is a global from the script tag in index.html
declare const htmlToImage: any;

/**
 * Generates a multi-page PDF from an HTML element by capturing it as an image.
 * This ensures a WYSIWYG result, matching the on-screen preview perfectly.
 * @param element - The HTML element to capture.
 * @param filename - The desired filename for the downloaded PDF.
 */
export const generatePDFfromHTML = async (element: HTMLElement, filename: string): Promise<void> => {
  if (!element) {
    throw new Error("Element not provided for PDF generation.");
  }

  try {
    // 1. Capture the element as a high-quality PNG data URL.
    // Use the element's natural width and its full scrollable height.
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.scrollHeight,
      style: {
        transform: 'scale(1)', // Ensure it's captured at full scale
        transformOrigin: 'top left',
        margin: '0',
        boxShadow: 'none',
        borderRadius: '0',
      },
    });

    // 2. Create a new jsPDF instance (A4 size, portrait, points as units)
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
    });

    // 3. Get image and PDF page dimensions
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 4. Scale image to fit the width of the PDF.
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    // 5. Handle multi-page logic
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add the first page
    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content is taller than one page
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // 6. Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error("Failed to generate PDF from HTML:", error);
    // Re-throw to be caught by the calling component's try/catch block
    throw new Error('PDF generation failed.');
  }
};