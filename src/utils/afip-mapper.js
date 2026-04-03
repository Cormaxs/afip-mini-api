import Decimal from 'decimal.js';

export class AfipMapper {
  static formatDetailItem(factura, proximoNumero) {
    const item = {
      Concepto: parseInt(factura.concepto) || 1,
      DocTipo: parseInt(factura.docTipo) || 99,
      DocNro: parseInt(factura.docNro) || 0,
      CbteDesde: parseInt(proximoNumero),
      CbteHasta: parseInt(proximoNumero),
      CbteFch: factura.fecha || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal: this._redondear(factura.importeTotal),
      ImpTotConc: this._redondear(factura.importeNoGravado) || 0,
      ImpNeto: this._redondear(factura.importeNeto),
      ImpOpEx: this._redondear(factura.importeExento) || 0,
      ImpTrib: this._redondear(factura.importeTributos) || 0,
      ImpIVA: this._redondear(factura.importeIVA),
      MonId: factura.moneda || 'PES',
      MonCotiz: parseFloat(factura.cotizacion) || 1,
      CondicionIVAReceptorId: parseInt(factura.condicionIVAReceptor) || 1
    };

    // IVA: estructura correcta (AlicIva como array)
    if (factura.iva && factura.iva.length > 0) {
      item.Iva = {
        AlicIva: factura.iva.map(iv => ({
          Id: parseInt(iv.id),
          BaseImp: this._redondear(iv.baseImponible),
          Importe: this._redondear(iv.importe)
        }))
      };
    }

    // Comprobantes asociados
    if (factura.comprobantesAsociados && factura.comprobantesAsociados.length > 0) {
      item.CbtesAsoc = {
        CbteAsoc: factura.comprobantesAsociados.map(asoc => ({
          Tipo: parseInt(asoc.tipo),
          PtoVta: parseInt(asoc.puntoVenta),
          Nro: parseInt(asoc.numero)
        }))
      };
    }

    // Tributos
    if (factura.tributos?.length > 0) {
      item.Tributos = {
        Tributo: factura.tributos.map(trib => ({
          Id: parseInt(trib.id),
          Desc: trib.descripcion,
          BaseImp: this._redondear(trib.baseImponible),
          Alic: parseFloat(trib.alicuota),
          Importe: this._redondear(trib.importe)
        }))
      };
    }

    return item;
  }

  static _redondear(valor) {
    if (valor === undefined || valor === null) return 0;
    // Usar Decimal para redondeo a 2 decimales (estilo comercial)
    return new Decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
}