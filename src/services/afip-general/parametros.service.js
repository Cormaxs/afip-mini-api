// src/services/parametros.service.js
import soap from 'soap';

export class ParametrosService {
  
  constructor() {
    this.url = process.env.AFIP_PRODUCTION === 'true'
      ? process.env.WSFE_URL_PRODUCTION
      : process.env.WSFE_URL_DEVELOPER;
  }

  /**
   * Obtener tipos de comprobante
   */
  async obtenerTiposComprobante(token, sign, cuit) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetTiposCbteAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        }
      });

      return result.FEParamGetTiposCbteResult.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo tipos de comprobante: ${error.message}`);
    }
  }

  /**
   * Obtener tipos de concepto
   */
  async obtenerTiposConcepto(token, sign, cuit) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetTiposConceptoAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        }
      });

      return result.FEParamGetTiposConceptoResult.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo tipos de concepto: ${error.message}`);
    }
  }

  /**
   * Obtener tipos de documento
   */
  async obtenerTiposDocumento(token, sign, cuit) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetTiposDocAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        }
      });

      return result.FEParamGetTiposDocResult.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo tipos de documento: ${error.message}`);
    }
  }

  /**
   * Obtener alícuotas de IVA
   */
  async obtenerTiposIva(token, sign, cuit) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetTiposIvaAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        }
      });

      return result.FEParamGetTiposIvaResult.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo tipos de IVA: ${error.message}`);
    }
  }

  /**
   * Obtener tipos de moneda
   */
  async obtenerTiposMoneda(token, sign, cuit) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetTiposMonedasAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        }
      });

      return result.FEParamGetTiposMonedasResult.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo tipos de moneda: ${error.message}`);
    }
  }

  /**
   * Obtener último número de comprobante
   */
  async obtenerUltimoComprobante(token, sign, cuit, puntoVenta, tipoComprobante) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FECompUltimoAutorizadoAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        },
        PtoVta: parseInt(puntoVenta),
        CbteTipo: parseInt(tipoComprobante)
      });
  
      const respuesta = result.FECompUltimoAutorizadoResult;
      
      // Si hay errores, lanzar excepción
      if (respuesta.Errors?.Err) {
        const errores = Array.isArray(respuesta.Errors.Err) 
          ? respuesta.Errors.Err 
          : [respuesta.Errors.Err];
        const mensajes = errores.map(e => e.Msg).join(', ');
        throw new Error(`AFIP error: ${mensajes}`);
      }
  
      return respuesta;
    } catch (error) {
      console.error(`Error obteniendo último comprobante (PV ${puntoVenta}, tipo ${tipoComprobante}):`, error.message);
      throw error; // relanzar para que el bucle lo capture
    }
  }

//cotizacion de moneda
  async obtenerCotizacionMoneda(token, sign, cuit, monedaId) {
    try {
      const client = await soap.createClientAsync(this.url);
      client.wsdl.options.rejectUnauthorized = false;
      
      const [result] = await client.FEParamGetCotizacionAsync({
        Auth: {
          Token: token,
          Sign: sign,
          Cuit: parseInt(cuit)
        },
        MonId: monedaId
      });
  
      return result?.FEParamGetCotizacionResult?.ResultGet;
    } catch (error) {
      throw new Error(`Error obteniendo cotización: ${error.message}`);
    }
  }


  /**
 * Consultar factura existente
 */
async consultarFactura(token, sign, cuit, puntoVenta, tipoComprobante, numero) {
  try {
    const client = await soap.createClientAsync(this.url);
    client.wsdl.options.rejectUnauthorized = false;
    
    const [result] = await client.FECompConsultarAsync({
      Auth: {
        Token: token,
        Sign: sign,
        Cuit: parseInt(cuit)
      },
      FeCompConsReq: {
        CbteTipo: parseInt(tipoComprobante),
        CbteNro: parseInt(numero),
        PtoVta: parseInt(puntoVenta)
      }
    });

    const respuesta = result?.FECompConsultarResult;
    
    if (!respuesta) {
      throw new Error('No se encontró el comprobante');
    }

    return {
      success: true,
      cae: respuesta.ResultGet?.CAE,
      caeVencimiento: respuesta.ResultGet?.CAEFchVto,
      resultado: respuesta.ResultGet?.Resultado,
      emision: respuesta.ResultGet?.CbteFch,
      vencimientoPago: respuesta.ResultGet?.FchVtoPago,
      importes: {
        neto: respuesta.ResultGet?.ImpNeto,
        iva: respuesta.ResultGet?.ImpIVA,
        total: respuesta.ResultGet?.ImpTotal
      }
    };
    
  } catch (error) {
    throw new Error(`Error consultando factura: ${error.message}`);
  }
}


// Método auxiliar para verificar la ecuación de importes
verificarEcuacionImportes(item) {
  const calculado = item.ImpNeto + item.ImpTotConc + item.ImpOpEx + item.ImpTrib + item.ImpIVA;
  const redondeado = Math.round(calculado * 100) / 100;
  const total = Math.round(item.ImpTotal * 100) / 100;
  
  if (redondeado !== total) {
    console.warn('⚠️ ADVERTENCIA: La ecuación de importes no coincide:', {
      esperado: total,
      calculado: redondeado,
      diferencia: total - redondeado,
      componentes: {
        ImpNeto: item.ImpNeto,
        ImpTotConc: item.ImpTotConc,
        ImpOpEx: item.ImpOpEx,
        ImpTrib: item.ImpTrib,
        ImpIVA: item.ImpIVA
      }
    });
  }
}



//pedir CAE a AFIP para una factura ya creada 

async consultarComprobante(token, sign, cuit, puntoVenta, tipoComprobante, numero) {
  try {
    const client = await soap.createClientAsync(this.url, { disableCache: true });
    client.wsdl.options.rejectUnauthorized = false;

    const request = {
      Auth: {
        Token: token,
        Sign: sign,
        Cuit: parseInt(cuit)
      },
      FeCompConsReq: {
        CbteNro: parseInt(numero),
        PtoVta: parseInt(puntoVenta),
        CbteTipo: parseInt(tipoComprobante)
      }
    };

    const [result] = await client.FECompConsultarAsync(request);
    const respuesta = result?.FECompConsultarResult;
    
    if (!respuesta) {
      throw new Error('No se recibió respuesta de AFIP');
    }

    // Procesar la respuesta
    return this._procesarRespuestaConsulta(respuesta);
    
  } catch (error) {
    console.error('❌ Error consultando comprobante:', error);
    throw error;
  }
}
  


//de prueba, despues borrar 
_procesarRespuestaConsulta(respuesta) {
  // Si hay errores, devolverlos
  if (respuesta.Errors?.Err) {
    const errores = Array.isArray(respuesta.Errors.Err) 
      ? respuesta.Errors.Err 
      : [respuesta.Errors.Err];
    
    return {
      success: false,
      errores: errores.map(e => ({
        codigo: e.Code,
        mensaje: e.Msg
      }))
    };
  }

  // Obtener el detalle del comprobante
  const detalle = respuesta.ResultGet;
  
  return {
    success: true,
    comprobante: {
      numero: detalle.CbteNro,
      puntoVenta: detalle.PtoVta,
      tipo: detalle.CbteTipo,
      fecha: detalle.CbteFch,
      importe: detalle.ImpTotal,
      resultado: detalle.Resultado, // 'A' = Aprobado, 'R' = Rechazado
      cae: detalle.CodAutorizacion,
      caeVencimiento: detalle.FchAutorizacion,
      emisor: {
        cuit: detalle.Cuit,
        documento: detalle.DocNro
      }
    },
    observaciones: this._formatearMensajes(respuesta.Observaciones?.Obs)
  };
}



  _formatearMensajes(data) {
    if (!data) return [];
    const mensajes = Array.isArray(data) ? data : [data];
    return mensajes.map(m => ({
      codigo: m.Code || m.codigo,
      mensaje: m.Msg || m.mensaje
    }));
  }
} 