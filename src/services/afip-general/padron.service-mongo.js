// src/services/padron.service.js
import soap from 'soap';
import { WSAAService } from '../wsaa.service-mongo.js';
import { CryptoUtils } from '../../utils/openssl.utils.crypto.js';
import {AuthAfipRepository} from '../../repositories/afip/authAfip.repository.js';



export class PadronService {
  constructor() {
    this.wsaa = new WSAAService();
    this.authAfipRepository = new AuthAfipRepository();
    this.crypto = new CryptoUtils();
    this.cachePadron = new Map(); // Cache para resultados de CUIT (opcional)
  }

  // URLs del servicio
  getUrl(produccion = false) {
    return produccion
      ? 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5?wsdl'
      : 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5?wsdl';
  }

  // ============================================
  // OBTENER TA PARA EL PADRÓN (CON DB)
  // ============================================
  async obtenerTAPadron(userId, cuit, service) {
    try {
      //console.log('🚀 Iniciando obtención de TA para el padrón...');
      ////console.log(service)
      // 1. Buscar token vigente en DB
      const tokenExistente = await this.authAfipRepository.obtenerTokenVigente(userId, service);
      
      if (tokenExistente) {
        //console.log('✅ Usando token guardado en DB');
        return {
          success: true,
          message: '✅ TA recuperado de DB',
          data: {
            servicio: service,//'ws_sr_padron_a5',
            expiracion: tokenExistente.expirationTime,
            cuit,
            fuente: 'db'
          }
        };
      }

      // 2. Obtener key y certificado de DB
      const { privateKey, certificate } = await this.authAfipRepository.obtenerKeyYCertificado(userId);
      
      // 3. Generar TRA usando wsaa.service.js
      const traXML = this.wsaa.generarTRAXML(service);
      
      // 4. Firmar TRA con crypto
      const cmsBase64 = await this.crypto.crearCMSFirmado(traXML, privateKey, certificate);
      
      // 5. Llamar a WSAA
      const xmlResponse = await this.wsaa.llamarWSAAconBase64(cmsBase64);
      
      // 6. Parsear respuesta
      const credentials = await this.wsaa.parsearRespuestaTA(xmlResponse);
      
      // 7. Guardar token en DB
      await this.authAfipRepository.guardarToken(userId, service, {
        token: credentials.token,
        sign: credentials.sign,
        expirationTime: credentials.expirationTime
      });

      //console.log('✅ TA para el padrón obtenido exitosamente');
      
      return {
        success: true,
        message: '✅ TA para el padrón obtenido correctamente',
        data: {
          servicio: service,
          expiracion: credentials.expirationTime,
          cuit,
          fuente: 'nuevo'
        }
      };
      
    } catch (error) {
      console.error('❌ Error en obtenerTAPadron:', error);
      
      // Si el error es alreadyAuthenticated, intentar recuperar de DB
      if (error.message.includes('alreadyAuthenticated')) {
        //console.log('⚠️ AFIP indica TA vigente');
        
        const token = await this.authAfipRepository.obtenerTokenVigente(userId, service);
        if (token) {
          return {
            success: true,
            message: '✅ TA recuperado de DB (ya existía)',
            data: {
              servicio: service,
              expiracion: token.expirationTime,
              cuit,
              fuente: 'db'
            }
          };
        }
      }
      
      throw new Error(`Error obteniendo TA para el padrón: ${error.message}`);
    }
  }

  // ============================================
  // CONSULTAR CUIT (usando TA del padrón)
  // ============================================
  async consultarCUIT(userId, cuit, cuitAConsultar) {
    try {
      // 1. Obtener token de DB
      const token = await this.authAfipRepository.obtenerTokenVigente(userId, 'ws_sr_padron_a5');
      
      if (!token) {
        return {
          success: false,
          message: '❌ No hay TA para el padrón',
          necesitaNuevoTA: true,
          accion: 'Usá /api/afip/padron/ticket/obtener primero'
        };
      }

      // Verificar vigencia (por si acaso)
      const ahora = new Date();
      const expiracion = new Date(token.expirationTime);
      
      if (expiracion < ahora) {
        return {
          success: false,
          message: '❌ TA del padrón expirado',
          necesitaNuevoTA: true,
          accion: 'Usá /api/afip/padron/ticket/obtener para renovarlo'
        };
      }

      // 2. Verificar cache (1 hora) - OPCIONAL
      const cacheKey = `${cuitAConsultar}`;
      if (this.cachePadron.has(cacheKey)) {
        const cached = this.cachePadron.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) {
          //console.log('📦 Usando caché para CUIT', cuitAConsultar);
          return {
            success: true,
            message: '✅ Datos obtenidos del caché',
            data: cached.data
          };
        }
      }

      // 3. Consultar a AFIP
      const url = process.env.AFIP_PRODUCTION === 'true'
        ? 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5?wsdl'
        : 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5?wsdl';

      //console.log(`📡 Consultando AFIP: ${url}`);
      
      const client = await soap.createClientAsync(url, { timeout: 15000 });
      client.wsdl.options.rejectUnauthorized = false;

      const [result] = await client.getPersonaAsync({
        token: token.token,
        sign: token.sign,
        cuitRepresentada: parseInt(cuit),
        idPersona: parseInt(cuitAConsultar)
      });

      const persona = result?.personaReturn?.persona;
      
      if (!persona) {
        throw new Error('No se encontraron datos para el CUIT');
      }

      // 4. Procesar datos
      const datos = {
        cuit: persona.idPersona,
        razonSocial: persona.nombre,
        tipoPersona: persona.tipoPersona === 'FISICA' ? 'Física' : 'Jurídica',
        domicilio: persona.domicilio ? {
          calle: persona.domicilio.descripcionDomicilio,
          localidad: persona.domicilio.descripcionLocalidad,
          provincia: persona.domicilio.descripcionProvincia,
          codigoPostal: persona.domicilio.codPostal
        } : null,
        actividad: persona.actividad ? {
          principal: persona.actividad.descripcionActividad,
          fechaInicio: persona.actividad.fechaActividad
        } : null,
        condicionIVA: persona.categoriaIVA ? 
          persona.categoriaIVA.map(cat => cat.descripcionCategoria).join(', ') : 'No inscripto',
        fechaInscripcion: persona.fechaInscripcion,
        estado: persona.estadoPersona
      };

      // 5. Guardar en cache (opcional)
      this.cachePadron.set(cacheKey, {
        timestamp: Date.now(),
        data: datos
      });

      return {
        success: true,
        message: '✅ Datos obtenidos correctamente',
        data: datos
      };

    } catch (error) {
      console.error('❌ Error consultando CUIT:', error);
      
      // Si el error es de autenticación, el TA puede haber expirado
      if (error.message.includes('Auth') || error.message.includes('token')) {
        return {
          success: false,
          message: '❌ Error de autenticación con AFIP',
          necesitaNuevoTA: true,
          error: error.message,
          accion: 'Usá /api/afip/padron/ticket/obtener para renovar el TA'
        };
      }
      
      return {
        success: false,
        message: '❌ Error consultando CUIT',
        error: error.message
      };
    }
  }

  // ============================================
  // LIMPIAR CACHÉ
  // ============================================
  limpiarCache() {
    this.cachePadron.clear();
    //console.log('🧹 Cache del padrón limpiado');
    return {
      success: true,
      message: '✅ Cache del padrón limpiado'
    };
  }
}