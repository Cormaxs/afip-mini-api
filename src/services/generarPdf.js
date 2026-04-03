import { generarPDFDesdeEstructura } from './facturas/estructura_pdf.js';

export default class PdfService {
  
  async generarFacturaPDF(datos, id, qrBase64) {
   // console.log('⏳ Iniciando generación de PDF...');

    try {
      const datosConQr = {
        ...datos,
        comprobante: {
          ...datos.comprobante,
          qrImage: qrBase64
        }
      };
      const pdfBuffer = await generarPDFDesdeEstructura(datosConQr, qrBase64);
      
      //console.log(`✅ PDF generado - Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error crítico en PdfService:', error);
      throw error;
    }
  }
}