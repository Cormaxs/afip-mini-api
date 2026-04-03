import { AfipCert } from '../../models/afipCert.model.js';
import { AfipToken } from '../../models/afipToken.model.js';
import {User} from '../../models/dataUser.model.js';



export class AuthAfipRepository {
    /**
   * Guarda la Key y CSR generados (Paso 1)
   */
  async guardarKeyYCSR(userId, privateKey, csr, metadata = {}) {
    try {
      // Buscar si ya existe un certificado para este usuario
      let certificado = await AfipCert.findOne({ 
        userId,
        activo: true,
        entorno: metadata.entorno || 'homo'
      });

      if (certificado) {
        // Actualizar el existente
        certificado.privateKey = privateKey;
        certificado.csr = csr;
        certificado.metadata = {
          ...certificado.metadata,
          ...metadata,
          csrGeneradoAt: new Date()
        };
        await certificado.save();
        //console.log('✅ CSR y Key actualizados en DB');
      } else {
        // Crear nuevo registro
        certificado = new AfipCert({
          userId,
          privateKey,
          csr,
          entorno: metadata.entorno || 'homo',
          alias: metadata.alias,
          metadata: {
            ...metadata,
            csrGeneradoAt: new Date()
          },
          activo: true
        });
        await certificado.save();
        //console.log('✅ CSR y Key guardados en DB');
      }
      return certificado;
    } catch (error) {
      console.error('❌ Error guardando Key/CSR:', error);
      throw error;
    }
  }

  /**
   * Guarda el certificado CRT (Paso 2)
   */
  async guardarCertificado(userId, certificate, metadata = {}) {
    try {
      let certificado = await AfipCert.findOne({ 
        userId,
        activo: true,
        entorno: metadata.entorno || 'homo'
      });

      if (!certificado) {
        certificado = new AfipCert({
          userId,
          certificate,
          entorno: metadata.entorno || 'homo',
          alias: metadata.alias,
          fechaVencimiento: metadata.fechaVencimiento,
          activo: true
        });
      } else {
        certificado.certificate = certificate;
        certificado.fechaVencimiento = metadata.fechaVencimiento;
      }

      await certificado.save();

      // Actualizar el usuario con referencia al certificado activo
      await User.findByIdAndUpdate(userId, {
        'config.certificadoActivo': true,
        'config.fechaVencimientoCert': metadata.fechaVencimiento,
        'config.idCertificadoEnBD': certificado._id
      });

      //console.log('✅ Certificado CRT guardado en DB');
      return certificado;
    } catch (error) {
      console.error('❌ Error guardando certificado:', error);
      throw error;
    }
  }

  /**
   * Obtiene la Key y Certificado activos de un usuario
   */
  async obtenerKeyYCertificado(userId, entorno = 'homo') {
    try {
      const certificado = await AfipCert.findOne({
        userId,
        entorno,
        activo: true,
        certificate: { $exists: true, $ne: null } // Que tenga certificado
      });

      if (!certificado) {
        throw new Error(`No hay certificado activo para usuario ${userId} en entorno ${entorno}`);
      }

      return {
        privateKey: certificado.privateKey,
        certificate: certificado.certificate,
        csr: certificado.csr,
        fechaVencimiento: certificado.fechaVencimiento,
        _id: certificado._id
      };
    } catch (error) {
      console.error('❌ Error obteniendo Key/Cert:', error);
      throw error;
    }
  }

  /**
   * Obtiene solo el CSR (para mostrarlo al usuario)
   */
  async obtenerCSR(userId, entorno = 'homo') {
    try {
      const certificado = await AfipCert.findOne({
        userId,
        entorno,
        activo: true,
        csr: { $exists: true, $ne: null }
      });
      return certificado?.csr || null;
    } catch (error) {
      console.error('❌ Error obteniendo CSR:', error);
      throw error;
    }
  }

  // ============================================
  // TOKENS DE ACCESO (TA)
  // ============================================

  /**
   * Guarda un token de acceso
   */
  async guardarToken(userId, service, tokenData) {
    try {
      const token = await AfipToken.findOneAndUpdate(
        { userId, service },
        {
          token: tokenData.token,
          sign: tokenData.sign,
          expirationTime: tokenData.expirationTime
        },
        { upsert: true, new: true }
      );

      // Actualizar estadísticas del usuario
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalTokens': 1 },
        'stats.lastTokenAt': new Date()
      });

      //console.log(`✅ Token ${service} guardado en DB`);
      return token;
    } catch (error) {
      console.error('❌ Error guardando token:', error);
      throw error;
    }
  }

  /**
   * Obtiene un token vigente
   */
  async obtenerTokenVigente(userId, service) {
    try {
      const token = await AfipToken.findOne({
        userId,
        service,
        expirationTime: { $gt: new Date() }
      });
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo token vigente:', error);
      throw error;
    }
  }

  /**
   * Elimina tokens expirados (para limpieza)
   */
  async limpiarTokensExpirados() {
    try {
      const result = await AfipToken.deleteMany({
        expirationTime: { $lt: new Date() }
      });
     // console.log(`🧹 ${result.deletedCount} tokens expirados eliminados`);
      return result;
    } catch (error) {
      console.error('❌ Error limpiando tokens:', error);
      throw error;
    }
  }



//necesario apra jobs-cron
async buscarTokensPorVencer(fechaLimite) {
  try {
    const tokens = await AfipToken.find({
      expirationTime: { $lt: fechaLimite, $gt: new Date() }
    }).populate('userId'); // Si querés traer datos del usuario
    
    return tokens;
  } catch (error) {
    console.error('❌ Error buscando tokens por vencer:', error);
    throw error;
  }
}


}
