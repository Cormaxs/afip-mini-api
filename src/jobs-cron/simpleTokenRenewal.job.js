// src/jobs/simpleTokenRenewal.job.js
import { AfipRepository } from '../repositories/afip.repository.js';
import { AfipService } from '../services/afip.service-mongo.js';
import { PadronService } from '../services/padron.service-mongo.js';

const afipRepo = new AfipRepository();
const afipService = new AfipService();
const padronService = new PadronService();

/**
 * Renueva tokens que expiren en las próximas 3 horas
 */
export async function renovarTokensProximosAVencer() {
  console.log('🔄 Iniciando renovación de tokens próximos a vencer...');
  const inicio = Date.now();

  try {
    // Buscar tokens que expiren en menos de 3 horas
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 3 * 60 * 60 * 1000);
    
    const tokensPorVencer = await afipRepo.buscarTokensPorVencer(limite);
    
    console.log(`📊 Se encontraron ${tokensPorVencer.length} tokens por renovar`);

    for (const token of tokensPorVencer) {
      try {
        const userId = token.userId.toString();
        
        // Obtener el CUIT del usuario
        const { User } = await import('../models/dataUser.model.js');
        const usuario = await User.findById(userId);
        
        if (!usuario) {
          console.log(`  ⚠️ Usuario ${userId} no encontrado`);
          continue;
        }

        const tiempoRestante = (new Date(token.expirationTime) - ahora) / (1000 * 60 * 60);
        console.log(`  🔄 Token ${token.service} - Usuario ${userId} - Expira en ${tiempoRestante.toFixed(2)}h`);

        if (token.service === 'wsfe') {
          await afipService.obtenerTicketAcceso(userId, usuario.cuit, 'wsfe');
        } else if (token.service === 'ws_sr_padron_a5') {
          await padronService.obtenerTAPadron(userId, usuario.cuit, 'ws_sr_padron_a5');
        }

        console.log(`  ✅ Token ${token.service} renovado`);
        
        // Pausa para no saturar AFIP
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Error renovando token:`, error.message);
      }
    }

    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
    console.log(`✅ Proceso completado en ${duracion}s`);

  } catch (error) {
    console.error('❌ Error en renovación automática:', error);
  }
}

/**
 * Inicia el proceso de renovación automática
 * @param {number} intervaloHoras - Cada cuántas horas ejecutar (default: 3)
 */
export function iniciarRenovacionAutomatica(intervaloHoras = 3) {
  const intervaloMs = intervaloHoras * 60 * 60 * 1000;
  
  console.log(`🚀 Iniciando renovación automática cada ${intervaloHoras} horas`);
  console.log(`⏰ Próxima ejecución: ${new Date(Date.now() + intervaloMs).toLocaleString()}`);
  
  // Ejecutar inmediatamente al iniciar
  setTimeout(() => {
    renovarTokensProximosAVencer();
  }, 5000); // Esperar 5 segundos a que todo esté listo
  
  // Programar ejecución periódica
  const intervaloId = setInterval(renovarTokensProximosAVencer, intervaloMs);
  
  // Permitir que Node.js termine si es necesario
  intervaloId.unref();
  
  return intervaloId;
}