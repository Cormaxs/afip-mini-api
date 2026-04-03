// src/utils/crypto.utils.js
import forge from 'node-forge';

export class CryptoUtils {
  
  /**
   * Generar Key y CSR (Paso 1 - Funciona con AFIP)
   */
  generarKeyYCSR(datos) {
    try {
      // 1. Generar par de llaves RSA de 2048 bits
      const keys = forge.pki.rsa.generateKeyPair(2048);
      
      // 2. Crear CSR
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      
      // 3. Agregar subject (datos del certificado) - AFIP requiere estos campos
      const attributes = [
        { name: 'countryName', value: datos.country || 'AR' },
        { name: 'stateOrProvinceName', value: datos.state || 'BuenosAires' },
        { name: 'localityName', value: datos.locality || 'CABA' },
        { name: 'organizationName', value: datos.organization || 'MiEmpresa' },
        { name: 'organizationalUnitName', value: datos.organizationalUnit || 'Sistemas' },
        { name: 'commonName', value: datos.organization || 'MiEmpresa' },
        { name: 'emailAddress', value: datos.emailAddress || 'test@test.com' }
      ];
      
      // Agregar serialNumber (CUIT) - OBLIGATORIO para AFIP
      if (datos.cuit) {
        attributes.push({
          name: 'serialNumber',
          value: `CUIT ${datos.cuit}`
        });
      }
      
      csr.setSubject(attributes);
      
      // 4. Firmar CSR con la clave privada
      csr.sign(keys.privateKey, forge.md.sha256.create());
      
      // 5. Verificar que el CSR sea válido
      if (!csr.verify()) {
        throw new Error('La verificación del CSR falló');
      }
      
      // 6. Convertir a PEM
      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const csrPem = forge.pki.certificationRequestToPem(csr);
      
      return {
        privateKey: privateKeyPem,
        csr: csrPem
      };
    } catch (error) {
      throw new Error(`Error generando Key/CSR: ${error.message}`);
    }
  }

  /**
   * Crear CMS firmado para enviar a WSAA (Paso 3 - ESENCIAL para AFIP)
   * Esto genera el CMS que AFIP espera en loginCms
   */
  async crearCMSFirmado(xmlContent, privateKeyPem, certificatePem) {
    try {
      // 1. Parsear certificado y clave
      const cert = forge.pki.certificateFromPem(certificatePem);
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      
      // 2. Crear PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData();
      
      // 3. Agregar contenido (el XML del TRA)
      p7.content = forge.util.createBuffer(xmlContent, 'utf8');
      
      // 4. Agregar certificado
      p7.addCertificate(cert);
      
      // 5. Agregar firma (SHA256 es lo que usa AFIP)
      p7.addSigner({
        key: privateKey,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256
      });
      
      // 6. Generar CMS en formato DER (binario)
      const derBuffer = forge.asn1.toDer(p7.toAsn1()).getBytes();
      
      // 7. Convertir a Base64 para enviar por SOAP
      const base64 = forge.util.encode64(derBuffer);
      
      return base64;
    } catch (error) {
      throw new Error(`Error creando CMS firmado: ${error.message}`);
    }
  }

  /**
   * Extraer fecha de vencimiento del certificado (útil para guardar metadatos)
   */
  extraerFechaVencimiento(certificatePem) {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      return cert.validity.notAfter;
    } catch (error) {
      console.warn('No se pudo extraer fecha de vencimiento');
      return null;
    }
  }

  /**
   * Extraer subject del certificado (para source en TRA si es necesario)
   */
  extraerSubject(certificatePem) {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      const subject = cert.subject.attributes;
      
      // Convertir a formato string que espera AFIP
      return subject.map(attr => `${attr.shortName}=${attr.value}`).join(', ');
    } catch (error) {
      console.warn('No se pudo extraer subject');
      return '';
    }
  }

  /**
   * Decodificar Base64 (útil para procesar respuestas)
   */
  decodeBase64(texto) {
    return forge.util.decode64(texto);
  }
}