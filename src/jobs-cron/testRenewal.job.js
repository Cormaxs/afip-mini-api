// src/jobs/testRenewal.job.js (archivo separado para testing)
import { renovarTokensProximosAVencer } from './simpleTokenRenewal.job.js';

// Forzar modo test
process.env.NODE_ENV = 'test';

console.log('🧪 INICIANDO TEST DE RENOVACIÓN CADA 1 MINUTO');
console.log('============================================');

// Ejecutar cada 1 minuto
const intervaloId = setInterval(async () => {
  console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Ejecutando renovación...`);
  await renovarTokensProximosAVencer();
}, 60 * 1000); // 1 minuto

// Detener después de 10 minutos (opcional)
setTimeout(() => {
  clearInterval(intervaloId);
  console.log('\n🛑 Test finalizado después de 10 minutos');
}, 10 * 60 * 1000);

// Para detener manualmente con Ctrl+C
process.on('SIGINT', () => {
  clearInterval(intervaloId);
  console.log('\n🛑 Test detenido manualmente');
  process.exit();
});


export default intervaloId;