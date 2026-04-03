import soap from 'soap';
import { ParametrosService } from '../afip-general/parametros.service.js';
import { AfipMapper } from '../../utils/afip-mapper.js';

const parametrosService = new ParametrosService();

export class FacturacionService {
  constructor() {
    this.url = process.env.AFIP_PRODUCTION === 'true'
    ? process.env.WSFE_URL_PRODUCTION
    : process.env.WSFE_URL_DEVELOPER;
  }


  async crearFactura(token, sign, cuit, factura, datosUser) {
    try {
      const client = await soap.createClientAsync(this.url, { disableCache: true });
      client.wsdl.options.rejectUnauthorized = false;

       const ultimo = await parametrosService.obtenerUltimoComprobante(
          token, sign, cuit, factura.puntoVenta, factura.tipoComprobante
        );
        const proximo = (ultimo?.CbteNro || 0) + 1;

      // ✅ Usa el mapper que SOLO LEE los datos validados
      const item = AfipMapper.formatDetailItem(factura, proximo);

      const request = {
        Auth: { Token: token, Sign: sign, Cuit: parseInt(cuit) },
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: parseInt(factura.puntoVenta),
            CbteTipo: parseInt(factura.tipoComprobante)
          },
          FeDetReq: { FECAEDetRequest: [item] }
        }
      };
     // console.log("antes ed mandar a afip ->", request)

      const [result] = await client.FECAESolicitarAsync(request);
//console.log('Respuesta cruda de AFIP:', JSON.stringify(result, null, 2));
return this._procesarRespuesta(result?.FECAESolicitarResult);

    } catch (error) {
      console.error('❌ Error FacturacionService:', error);
      throw error;
    }
  }

  _procesarRespuesta(respuesta) {
    if (!respuesta) throw new Error('No se recibió respuesta de AFIP');
  
    const feDetRespuesta = Array.isArray(respuesta.FeDetResp?.FECAEDetResponse) 
      ? respuesta.FeDetResp.FECAEDetResponse[0] 
      : respuesta.FeDetResp?.FECAEDetResponse;
  
    const esExitoso = (respuesta.FeCabReq?.Resultado === 'A' || feDetRespuesta?.Resultado === 'A');
  
    return {
      success: esExitoso,
      resultado: feDetRespuesta?.Resultado || 'R',
      cae: feDetRespuesta?.CAE,
      caeVencimiento: feDetRespuesta?.CAEFchVto,
      numero: feDetRespuesta?.CbteDesde,
      observaciones: this._formatearMensajes(respuesta.Observaciones?.Obs || feDetRespuesta?.Observaciones?.Obs),
      errores: this._formatearMensajes(respuesta.Errors?.Err)
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


// Método para formatear la factura recuperada al formato que espera crearFactura para reintentar mandar factura a afip
formatearFacturaParaReintento(factura) {
  const fechaActual = new Date();
  const fechaStr = `${fechaActual.getFullYear()}${String(fechaActual.getMonth()+1).padStart(2,'0')}${String(fechaActual.getDate()).padStart(2,'0')}`;

  return {
    puntoVenta: factura.afip.puntoVenta,
    tipoComprobante: factura.afip.tipoComprobante,
    // NO incluir numeroFactura
    concepto: factura.concepto || 1,
    docTipo: factura.receptor.tipoDocumento,
    docNro: parseInt(factura.receptor.numeroDocumento),
    // Deja que el validador corrija condicionIVAReceptor
    condicionIVAReceptor: factura.receptor.condicionIVA === 'Responsable Inscripto' ? 1 : 
                          (factura.receptor.condicionIVA === 'Consumidor Final' ? 5 : 2),
    importeNeto: factura.totales.subtotal,
    importeIVA: factura.totales.iva,
    importeTotal: factura.totales.total,
    importeNoGravado: 0,
    importeExento: 0,
    importeTributos: 0,
    moneda: factura.comprobante.moneda,
    cotizacion: factura.comprobante.cotizacion,
    fecha: fechaStr,
    items: factura.items.map(item => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      alicuotaIVA: item.idAlicuotaIVA || (item.alicuotaIVA === 21 ? 5 : item.alicuotaIVA === 10.5 ? 4 : 3),
      subtotal: item.subtotalConIVA,
      precioNeto: item.precioUnitario,
      precioConIVA: item.subtotalConIVA,
      importeIVA: item.importeIVA,
      tasaIVA: item.alicuotaIVA,
      idAlicuotaIVA: item.idAlicuotaIVA || (item.alicuotaIVA === 21 ? 5 : item.alicuotaIVA === 10.5 ? 4 : 3),
    })),
    // No incluir iva, el validador lo generará
  };
}

}