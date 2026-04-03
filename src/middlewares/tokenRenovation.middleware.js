// src/middlewares/tokenRenovation.middleware.js

import { AfipService } from '../services/certificados/certificados.service.js';
import { PadronService } from '../services/afip-general/padron.service-mongo.js';
import {AuthAfipRepository} from '../repositories/afip/authAfip.repository.js';


const authAfipRepository = new AuthAfipRepository();
const afipService = new AfipService();
const padronService = new PadronService();

export const tokenRenovationMiddleware = async (req, res, next) => {
  try {
    const { id, cuit, servicio } = req.body;
    console.log("🔑 Middleware token - Usuario:", id, "CUIT:", cuit, "Servicio:", servicio);
    
    if (!id || !cuit || !servicio) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere id, cuit y servicio en el body' 
      });
    }

    // Validar que el servicio sea válido
    const serviciosValidos = ['wsfe', 'ws_sr_padron_a5'];
    if (!serviciosValidos.includes(servicio)) {
      return res.status(400).json({
        success: false,
        error: 'Servicio inválido. Debe ser wsfe o ws_sr_padron_a5'
      });
    }

    // Determinar si es padrón por el servicio (ya no por la URL)
    const esPadron = servicio === 'ws_sr_padron_a5';
    
    console.log(`🔍 [${servicio}] Verificando token para usuario ${id}`);

    // Verificar que el usuario tenga certificado
    try {
      await authAfipRepository.obtenerKeyYCertificado(id);
      console.log(`✅ Certificado encontrado`);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'No hay certificado activo',
        paso: 1,
        accion: 'Ejecutá /certificado/generar y /certificado/guardar primero'
      });
    }

    // Buscar token vigente (NO expirado)
    let token = await authAfipRepository.obtenerTokenVigente(id, servicio);
    
    const ahora = new Date();
    
    // Si NO hay token o está vencido
    if (!token) {
      console.log(`🔄 No hay token vigente para ${servicio}, generando nuevo...`);
      
      // GENERAR NUEVO TOKEN según el servicio
      if (esPadron) {
        await padronService.obtenerTAPadron(id, cuit, servicio);
      } else {
        await afipService.obtenerTicketAcceso(id, cuit, servicio);
      }
      
      // Obtener el token recién generado
      token = await authAfipRepository.obtenerTokenVigente(id, servicio);
      console.log(`✅ Token generado exitosamente`);
      
    } else {
      // Verificar tiempo de expiración
      const tiempoRestante = (new Date(token.expirationTime) - ahora) / (1000 * 60 * 60); // en horas
      
      console.log(`⏰ Token ${servicio} - Expira en ${tiempoRestante.toFixed(2)} horas`);
      
      // Si expira en menos de 3 horas, renovamos
      if (tiempoRestante < 3) {
        console.log(`⚠️ Token próximo a vencer (${tiempoRestante.toFixed(2)}h), renovando...`);
        
        if (esPadron) {
          await padronService.obtenerTAPadron(id, cuit, servicio);
        } else {
          await afipService.obtenerTicketAcceso(id, cuit, servicio);
        }
        
        // Obtener el token renovado
        token = await authAfipRepository.obtenerTokenVigente(id, servicio);
        console.log(`✅ Token renovado exitosamente`);
      }
    }

    // Verificar que tenemos token válido
    if (!token || !token.token || !token.sign) {
      throw new Error(`No se pudo obtener token válido para ${servicio}`);
    }

    // Adjuntar token al request
    req.token = {
      token: token.token,
      sign: token.sign,
      expiration: token.expirationTime,
      servicio
    };
    
    console.log(`✅ Middleware OK - Token ${servicio} listo (expira: ${new Date(token.expirationTime).toLocaleString()})`);
    
    next();
    
  } catch (error) {
    console.error('❌ Error en middleware de token:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};