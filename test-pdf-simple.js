// test-pdf-simple.js
import PDFDocument from 'pdfkit';
import fs from 'fs';

console.log('🧪 Test SIMPLE con PDFKit');

// Crear un documento PDF simple
const doc = new PDFDocument();
const chunks = [];

// Acumular los chunks del PDF
doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
  const pdfBuffer = Buffer.concat(chunks);
  console.log(`✅ PDF generado! Tamaño: ${pdfBuffer.length} bytes`);
  console.log('🎉 PDFKIT FUNCIONA CORRECTAMENTE');
  
  // Opcional: guardar el archivo para verlo
  fs.writeFileSync('test-output.pdf', pdfBuffer);
  console.log('📄 Archivo guardado como: test-output.pdf');
  
  process.exit(0);
});

doc.on('error', (err) => {
  console.error('❌ Error generando PDF:', err);
  process.exit(1);
});

console.log('⏳ Creando PDF con PDFKit...');

// Agregar contenido al PDF
doc.fontSize(25).text('Hola Mundo - Test con PDFKit', 100, 100);
doc.moveDown();
doc.fontSize(12).text('Este es un test para verificar que PDFKit funciona correctamente.');
doc.text(`Fecha del test: ${new Date().toLocaleString()}`);

// Finalizar el documento
doc.end();

// Timeout por si acaso
setTimeout(() => {
  console.error('❌ TIMEOUT - PDFKit no respondió en 5 segundos');
  process.exit(1);
}, 5000);