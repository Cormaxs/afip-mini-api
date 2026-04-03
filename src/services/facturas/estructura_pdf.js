import PDFDocument from 'pdfkit';

export const formatCurrency = (amount) => {
   if (amount === undefined || amount === null) amount = 0;
   return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
   }).format(amount).replace(/\u00A0/g, ' ');
};

function formatCuit(cuit) {
   if (!cuit || cuit === '0') return '0';
   const cleaned = String(cuit).replace(/[^0-9]/g, '');
   return cleaned.length === 11
      ? `${cleaned.substring(0, 2)}-${cleaned.substring(2, 10)}-${cleaned.substring(10)}`
      : cuit;
}

export const generarPDFDesdeEstructura = (datos, qrBase64) => {
   //console.log("datos-> en estructurapdf", datos);
   return new Promise((resolve, reject) => {
      try {
         const chunks = [];
         const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

         doc.on('data', chunk => chunks.push(chunk));
         doc.on('end', () => resolve(Buffer.concat(chunks)));
         doc.on('error', reject);

         let yPos = 40;
         const pageHeight = 750; // Altura útil de página A4 (842 - márgenes)

         // Identificar tipo de factura
         const codigo = datos.comprobante.codigoTipo;
         const esFacturaA = codigo === 1;
         const esFacturaB = codigo === 6;
         const esFacturaC = codigo === 11;
         let letra = 'C';
         if (codigo === 1) letra = 'A';
         else if (codigo === 6) letra = 'B';

         // Función para verificar espacio y crear nueva página
         const checkSpace = (neededSpace = 50) => {
            if (yPos + neededSpace > pageHeight) {
               doc.addPage();
               yPos = 40;
               return true;
            }
            return false;
         };

         // --- FUNCIÓN PARA REPETIR HEADERS ---
         const printTableHeaders = (y) => {
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
            
            if (esFacturaA) {
               doc.text('DESCRIPCIÓN', 40, y);
               doc.text('CANT.', 250, y, { width: 50, align: 'right' });
               doc.text('PRECIO NETO', 310, y, { width: 80, align: 'right' });
               doc.text('IVA %', 390, y, { width: 40, align: 'right' });
               doc.text('SUBTOTAL', 450, y, { width: 80, align: 'right' });
            } else {
               doc.text('DESCRIPCIÓN', 40, y);
               doc.text('CANT.', 280, y, { width: 50, align: 'right' });
               doc.text('PRECIO FINAL', 330, y, { width: 100, align: 'right' });
               doc.text('SUBTOTAL', 450, y, { width: 80, align: 'right' });
            }
            
            doc.moveTo(40, y + 12).lineTo(550, y + 12).lineWidth(0.5).stroke('#333');
            return y + 20;
         };

         // --- 1. CABECERA ---
         checkSpace(120);
         
         const puntoVentaFmt = String(datos.comprobante.puntoVenta).replace(/[^0-9]/g, '').padStart(4, '0');
         const numeroSolo = String(datos.comprobante.numero).split('-').pop();
         const numeroFmt = numeroSolo.padStart(8, '0');

         // Recuadro de letra
         doc.rect(282, yPos, 30, 30).stroke('#333');
         doc.fontSize(20).font('Helvetica-Bold').text(letra, 282, yPos + 7, { width: 30, align: 'center' });
         doc.fontSize(7).text(`COD. 0${codigo || '1'}`, 282, yPos + 32, { width: 30, align: 'center' });

         // Razón social y título
         doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(datos.emisor.razonSocial, 40, yPos + 5);
         doc.fontSize(12).text('FACTURA', 350, yPos + 5, { align: 'right', width: 200 });

         yPos += 25;

         // Datos básicos del emisor
         doc.fontSize(9).font('Helvetica').fillColor('#444');
         doc.text(`CUIT: ${formatCuit(datos.emisor.cuit)}`, 40, yPos);
         doc.text(`Nro: ${puntoVentaFmt}-${numeroFmt}`, 350, yPos, { align: 'right', width: 200 });

         yPos += 15;
         doc.text(datos.emisor.domicilio, 40, yPos);
         doc.text(`Fecha: ${datos.comprobante.fecha}`, 350, yPos, { align: 'right', width: 200 });

         yPos += 20;
         doc.fontSize(8).fillColor('#666');
         doc.text(`Ingresos Brutos: ${datos.emisor.iibb || 'N/A'}`, 40, yPos);
         doc.text(`Inicio Actividades: ${datos.emisor.fechaInicioActividades || 'N/A'}`, 250, yPos);
         
         yPos += 25;

       // --- 2. RECEPTOR Y CONDICIÓN DE PAGO ---
       checkSpace(80);
       doc.moveTo(40, yPos).lineTo(550, yPos).lineWidth(0.5).stroke('#CCC');
       yPos += 15;
       
       // Etiqueta Estética de Método de Pago (Alineada a la derecha)
       const metodoPago = (datos.pagos.formaPago || 'No especificado').toUpperCase();
       
       // Dibujamos un "Badge" o etiqueta destacada
       doc.rect(430, yPos, 120, 22).fill('#f4f4f4'); // Fondo gris claro
       doc.fontSize(7).font('Helvetica-Bold').fillColor('#666').text('METODO DE PAGO  ', 430, yPos + 4, { width: 120, align: 'center' });
       doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text(metodoPago, 430, yPos + 12, { width: 120, align: 'center' });

       // Datos del Cliente (Alineados a la izquierda)
       doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('RECEPTOR', 40, yPos);
       yPos += 15;
       doc.fontSize(9).font('Helvetica').fillColor('#333');
       doc.text(`Nombre/Razón Social: ${datos.receptor.razonSocial}`, 40, yPos);
       yPos += 13;
       doc.text(`CUIT/DNI: ${formatCuit(datos.receptor.cuit)}`, 40, yPos);
       doc.text(`Cond. IVA: ${datos.receptor.condicionIVA}`, 250, yPos);
       yPos += 13;
       doc.text(`Domicilio: ${datos.receptor.domicilio || 'N/A'}`, 40, yPos);

       yPos += 25;

         // --- 3. TABLA DE PRODUCTOS ---
         checkSpace(50);
         yPos = printTableHeaders(yPos);

         datos.items.forEach((item) => {
            // Calcular espacio necesario para este item
            const lineHeight = 18;
            if (yPos + lineHeight > pageHeight - 100) { // Dejar espacio para totales
               doc.addPage();
               yPos = 40;
               yPos = printTableHeaders(yPos);
            }

            doc.fontSize(9).font('Helvetica').fillColor('#333');
            
            // Descripción (con ajuste de altura)
            const descripcionLines = doc.heightOfString(item.descripcion, { width: 230 });
            doc.text(item.descripcion, 40, yPos, { width: 230 });
            
            // Cantidad
            doc.text(item.cantidad.toString(), 250, yPos, { width: 50, align: 'right' });

            if (esFacturaA) {
               doc.text(formatCurrency(item.precioUnitario), 310, yPos, { width: 80, align: 'right' });
               doc.text(`${item.alicuotaIVA || 21}%`, 390, yPos, { width: 40, align: 'right' });
               doc.text(formatCurrency(item.precioUnitario * item.cantidad), 450, yPos, { width: 80, align: 'right' });
            } else {
               doc.text(formatCurrency(item.precioUnitario), 330, yPos, { width: 100, align: 'right' });
               doc.text(formatCurrency(item.precioUnitario * item.cantidad), 450, yPos, { width: 80, align: 'right' });
            }

            // Avanzar según la altura real de la descripción
            yPos += Math.max(descripcionLines, 18);
         });
// --- 3.5 OBSERVACIONES / LEYENDA LEY 27.743 ---
if (datos.observaciones /*&& datos.comprobante.tipo !== 'FACTURA A' && datos.comprobante.tipo !== 'FACTURA C'*/) {
   checkSpace(40); // Espacio mínimo para el bloque
   yPos += 10;
   
   // Recuadro sutil para las observaciones
   doc.rect(40, yPos, 510, 30).fillAndStroke('#f9f9f9', '#EEE');
   
   doc.fontSize(8).font('Helvetica-Bold').fillColor('#333')
      .text('OBSERVACIONES:', 45, yPos + 5);
   
   doc.fontSize(8).font('Helvetica').fillColor('#444')
      .text(datos.observaciones, 45, yPos + 15, { width: 500 });
      
   yPos += 40; // Espacio que ocupó el bloque
}
         yPos += 10;

         // --- 4. TOTALES ---
         checkSpace(100);
         
         doc.moveTo(350, yPos).lineTo(550, yPos).lineWidth(0.5).stroke('#CCC');
         yPos += 15;

         if (esFacturaA) {
            // Factura A: Subtotal + IVA + Total
            doc.fontSize(10).font('Helvetica');
            
            const subtotalLine = `Subtotal: ${formatCurrency(datos.totales.subtotal)}`;
            doc.text(subtotalLine, 350, yPos, { width: 200, align: 'right' });
            
            yPos += 18;
            const ivaLine = `IVA: ${formatCurrency(datos.totales.iva)}`;
            doc.text(ivaLine, 350, yPos, { width: 200, align: 'right' });
            
            yPos += 20;
            doc.fontSize(11).font('Helvetica-Bold');
            const totalLine = `TOTAL: ${formatCurrency(datos.totales.total)}`;
            doc.text(totalLine, 350, yPos, { width: 200, align: 'right' });
            
            yPos += 25;
         } else {
            // Factura B o C: SOLO TOTAL
            doc.fontSize(11).font('Helvetica-Bold');
            const totalLine = `TOTAL: ${formatCurrency(datos.totales.total)}`;
            doc.text(totalLine, 350, yPos, { width: 200, align: 'right' });
            
            yPos += 20;
         }

         // --- 5. CAE Y QR ---
         checkSpace(100);
         
         const qrY = Math.max(yPos, pageHeight - 120); // Posicionar QR cerca del final
         
         if (qrBase64) {
            try {
               const qrBuffer = Buffer.from(qrBase64.split(',')[1], 'base64');
               doc.image(qrBuffer, 40, qrY, { width: 65, height: 65 });
            } catch (e) { console.error("Error QR:", e); }
         }

         doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
         doc.text(`CAE: ${datos.comprobante.cae}`, 120, qrY + 10);
         doc.font('Helvetica').text(`Vencimiento: ${datos.comprobante.fechaVtoCae}`, 120, qrY + 23);

         // --- 6. LEYENDAS ---
         const leyendaY = qrY + 50;
         
         doc.fontSize(6.5).fillColor('#666').font('Helvetica');
         doc.text(
            'El presente comprobante será válido siempre que los datos consignados en el mismo coincidan con los registrados en la base de datos de ARCA',
            80, leyendaY, { width: 500, align: 'center' }
         );
         
         doc.fontSize(7).fillColor('#777').font('Helvetica-Oblique')
            .text('Comprobante generado digitalmente por Sistema Facstock v1.0', 
                  40, leyendaY + 15, { align: 'center', width: 500 });

         doc.end();
      } catch (error) {
         reject(error);
      }
   });
};