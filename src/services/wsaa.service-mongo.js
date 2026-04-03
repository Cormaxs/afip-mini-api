// src/services/wsaa.service.js
import soap from 'soap';
import xml2js from 'xml2js';
import { DateUtils } from '../utils/date.utils.js';

export class WSAAService {
  
  getWsaaUrl() {
    return process.env.AFIP_PRODUCTION === 'true'
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl';
  }

  /**
   * Genera el XML del TRA en memoria (sin archivos)
   */
  generarTRAXML(service) {
    const timestamps = DateUtils.generateTimestampId();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${timestamps.uniqueId}</uniqueId>
    <generationTime>${timestamps.generationTime}</generationTime>
    <expirationTime>${timestamps.expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
  }

  /**
   * Llama a WSAA directamente con el CMS en Base64 (sin archivos intermedios)
   */
  async llamarWSAAconBase64(cmsBase64) {
    try {
      const client = await soap.createClientAsync(this.getWsaaUrl());
      client.wsdl.options.rejectUnauthorized = false;
      client.wsdl.options.strictSSL = false;
      
      const rawSoapResult = await client.loginCmsAsync({ in0: cmsBase64 });
      
      if (!rawSoapResult?.[0]?.loginCmsReturn) {
        throw new Error('La llamada a loginCms no devolvió loginCmsReturn');
      }
      
      return rawSoapResult[0].loginCmsReturn;
    } catch (error) {
      console.error('❌ Error en llamarWSAAconBase64:', error);
      throw error;
    }
  }

  /**
   * Parsea la respuesta XML del WSAA (sin archivos)
   */
  async parsearRespuestaTA(xmlResponse) {
    try {
      const parser = new xml2js.Parser();
      const parsed = await parser.parseStringPromise(xmlResponse);
      
      if (!parsed?.loginTicketResponse?.credentials?.[0]?.token?.[0]) {
        throw new Error('Respuesta XML no válida');
      }
      
      return {
        token: parsed.loginTicketResponse.credentials[0].token[0],
        sign: parsed.loginTicketResponse.credentials[0].sign[0],
        expirationTime: parsed.loginTicketResponse.header[0].expirationTime[0]
      };
    } catch (error) {
      console.error('❌ Error parseando respuesta TA:', error);
      throw error;
    }
  }

}