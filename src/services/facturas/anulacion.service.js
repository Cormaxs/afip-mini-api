// src/services/anulacion.service.js
import { FacturacionService } from './facturacion.service.js';
import {FacturaRepository} from '../../repositories/afip/factura.repository.js';
import {Factura} from '../../models/factura.model.js';


const facturaRepository = new FacturaRepository();
const facturacionService = new FacturacionService();

export class AnulacionService {
  
   
  //Anular una factura existente de forma total
  async anularFacturaTotal(token, sign, cuit, facturaOriginal, idUser) {
    try {
      // 1. Determinar el tipo de Nota de Crédito necesario según el tipo de comprobante original
      const mapeoTipos = { 1: 3, 6: 8, 11: 13 };
      const tipoNC = mapeoTipos[facturaOriginal.tipoComprobante];

      if (!tipoNC) {
        throw new Error(`No se encontró un tipo de Nota de Crédito para el comprobante ${facturaOriginal.tipoComprobante}`);
      }
     
      const notaCreditoData = {
        ...facturaOriginal,
        tipoComprobante: tipoNC,
        numeroFactura: facturaOriginal.numeroNotaCredito,  // ← importante
        comprobantesAsociados: [{
          tipo: facturaOriginal.tipoComprobante,
          puntoVenta: facturaOriginal.puntoVenta,
          numero: facturaOriginal.numero
        }]
      };

      // Guardar la NC como PENDIENTE (antes de enviar a AFIP)
    const ncGuardada = await facturaRepository.guardarNotaCredito(facturaOriginal, notaCreditoData, idUser);
      
      // 3. Reutilizar el servicio de facturación para obtener el CAE
      const resultadoNC = await facturacionService.crearFactura(token, sign, cuit, notaCreditoData);
      console.log('Resultado de creación de NC:', resultadoNC);
      if (!resultadoNC.success) {
        // Si AFIP rechaza, actualizar la NC a RECHAZADA
        await Factura.findByIdAndUpdate(ncGuardada._id, {
          estado: 'RECHAZADA',
          errores: resultadoNC.errores,
          motivo: 'Rechazada por AFIP'
        });
        return resultadoNC;
      }
      // Si es exitoso, actualizar NC y factura original
      await facturaRepository.actualizarAnulacionConAfip(ncGuardada._id, facturaOriginal, resultadoNC, notaCreditoData);
  
      return {
        success: true,
        message: 'Factura anulada correctamente',
        nc: resultadoNC
      };
    } catch (error) {
      console.error('❌ Error en AnulacionService:', error.message);
      throw error;
    }
  }
}