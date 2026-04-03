// src/services/afip.service.js
import soap from 'soap';
import { CryptoUtils } from '../../utils/openssl.utils.crypto.js';
import { WSAAService } from '../wsaa.service-mongo.js';
import { FacturacionService } from '../facturas/facturacion.service.js';
import {AuthAfipRepository} from '../../repositories/afip/authAfip.repository.js';


export class AfipService {
  constructor() {
    this.crypto = new CryptoUtils();
    this.wsaa = new WSAAService();
    this.authAfipRepository = new AuthAfipRepository();
    this.cachePadron = new Map();
    this.facturacion = new FacturacionService();
  }

  // ============================================
  // PASO 1: Generar Key y CSR
  // ============================================
  async generarKeyYCSR(userId, datos) {
    try {
      // Generar Key y CSR con crypto (todo en memoria)
      const { privateKey, csr } = this.crypto.generarKeyYCSR(datos);
      
      // Guardar en DB
      await this.authAfipRepository.guardarKeyYCSR(userId, privateKey, csr, {
        entorno: 'homo',
        ...datos
      });

      return {
        success: true,
        csr,
        privateKey,
        message: '✅ Key y CSR generados y guardados en DB'
      };
    } catch (error) {
      throw new Error(`Error generando certificados: ${error.message}`);
    }
  }

  // ============================================
  // PASO 2: Guardar certificado
  // ============================================
  async guardarCertificado(userId, certificadoContent) {
    try {
      if (!certificadoContent.includes('BEGIN CERTIFICATE')) {
        throw new Error('El certificado no tiene formato válido');
      }

      // Extraer fecha de vencimiento
      const fechaVencimiento = this.crypto.extraerFechaVencimiento(certificadoContent);
      
      // Guardar en DB
      await this.authAfipRepository.guardarCertificado(userId, certificadoContent, {
        fechaVencimiento,
        entorno: 'homo'
      });

      return {
        success: true,
        message: '✅ Certificado guardado en DB'
      };
    } catch (error) {
      throw new Error(`Error guardando certificado: ${error.message}`);
    }
  }

  // ============================================
  // PASO 3: Obtener Ticket de Acceso
  // ============================================
  async obtenerTicketAcceso(userId, cuit, servicio) {
    try {
      //console.log('🚀 Iniciando obtención de Ticket de Acceso...');
      
      // 1. Buscar token vigente en DB
      const tokenExistente = await this.authAfipRepository.obtenerTokenVigente(userId, servicio);
      
      if (tokenExistente) {
        //console.log('✅ Usando token guardado en DB');
        return {
          token: tokenExistente.token,
          sign: tokenExistente.sign,
          expiration: tokenExistente.expirationTime,
          cuit: parseInt(cuit),
          servicio
        };
      }

      // 2. Obtener key y certificado de DB
      const { privateKey, certificate } = await this.authAfipRepository.obtenerKeyYCertificado(userId);
      
      // 3. Generar TRA (el servicio wsaa genera el XML)
      const traXML = this.wsaa.generarTRAXML(servicio);
      
      // 4. Firmar TRA con crypto (genera CMS en Base64)
      const cmsBase64 = await this.crypto.crearCMSFirmado(traXML, privateKey, certificate);
      
      // 5. Llamar a WSAA
      const xmlResponse = await this.wsaa.llamarWSAAconBase64(cmsBase64);
      
      // 6. Parsear respuesta
      const credentials = await this.wsaa.parsearRespuestaTA(xmlResponse);
      
      // 7. Guardar token en DB
      await this.authAfipRepository.guardarToken(userId, servicio, {
        token: credentials.token,
        sign: credentials.sign,
        expirationTime: credentials.expirationTime
      });

      //console.log('✅ Ticket de Acceso obtenido exitosamente');
      
      return {
        token: credentials.token,
        sign: credentials.sign,
        expiration: credentials.expirationTime,
        cuit: parseInt(cuit),
        servicio
      };
    } catch (error) {
      console.error('❌ Error en obtenerTicketAcceso:', error);
      throw new Error(`Error obteniendo ticket de acceso: ${error.message}`);
    }
  }

  // ============================================
  // VERIFICAR ACCESO CON TA ACTUAL
  // ============================================
  async verificarAccesoConTAActual(userId, cuit, servicio = 'wsfe') {
    try {
      // 1. Buscar token vigente en DB
      const token = await this.authAfipRepository.obtenerTokenVigente(userId, servicio);
      
      if (!token) {
        return {
          success: false,
          message: '❌ No hay TA guardado. Ejecutá /credenciales/verificar primero',
          necesitaNuevoTA: true
        };
      }

      // Verificar vigencia
      const ahora = new Date();
      const expiracion = new Date(token.expirationTime);
      
      if (expiracion < ahora) {
        return {
          success: false,
          message: '❌ TA expirado',
          necesitaNuevoTA: true,
          expiracion: token.expirationTime
        };
      }

      // 2. Verificar que el certificado existe en DB
      await this.authAfipRepository.obtenerKeyYCertificado(userId);

      // 3. Llamar a AFIP para verificar
      try {
        const wsfeUrl = process.env.AFIP_PRODUCTION === 'true'
          ? process.env.WSFE_URL_PRODUCTION
          : process.env.WSFE_URL_DEVELOPER;
        
        const client = await soap.createClientAsync(wsfeUrl);
        client.wsdl.options.rejectUnauthorized = false;
        
        const [result] = await client.FEParamGetTiposCbteAsync({
          Auth: {
            Token: token.token,
            Sign: token.sign,
            Cuit: parseInt(cuit)
          }
        });
        
        return {
          success: true,
          message: '✅ Acceso confirmado - TA vigente y operativo',
          datos: {
            servicio,
            cuit,
            taExpiracion: token.expirationTime,
            minutosRestantes: Math.round((new Date(token.expirationTime) - new Date()) / 60000),
            timestamp: new Date().toISOString()
          }
        };
        
      } catch (soapError) {
        if (soapError.message.includes('Auth') || soapError.message.includes('token')) {
          return {
            success: false,
            message: '❌ TA inválido o sin permisos',
            necesitaNuevoTA: true,
            error: soapError.message
          };
        } else {
          return {
            success: false,
            message: '❌ Error de comunicación con AFIP',
            error: soapError.message
          };
        }
      }
      
    } catch (error) {
      return {
        success: false,
        message: '❌ Error verificando acceso',
        error: error.message
      };
    }
  }


  
}