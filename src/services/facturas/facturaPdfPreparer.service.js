import FacturaValidator from './facturaValidator.service.js';
import PdfService from '../generarPdf.js';

const pdfService = new PdfService();


export class FacturaPdfPreparerService {
  
  async generarPDF(factura, resultadoAfip, cuit, userId,  datosUser,qrBase64) {
    //console.log('📦 Preparando datos para PDF...');
    ////console.log("datos user desde pdf 1 ->", datosUser)
    this._validarDatosBasicos(factura, resultadoAfip);
    
    const datosParaPDF = this._prepararDatosPDF(factura, resultadoAfip, cuit, qrBase64, datosUser);
   // //console.log("datosParaPDF -> ", datosParaPDF, "qrBase64 -> ", qrBase64)
    return await pdfService.generarFacturaPDF(datosParaPDF, userId, qrBase64);
  }

  _validarDatosBasicos(factura, resultadoAfip) {
    if (!factura.tipoComprobante) throw new Error('Tipo de comprobante requerido');
    if (!factura.puntoVenta) throw new Error('Punto de venta requerido');
    if (!resultadoAfip.cae) throw new Error('CAE requerido');
    if (!resultadoAfip.numero) throw new Error('Número de comprobante requerido');
  }

  _prepararDatosPDF(factura, resultadoAfip, cuit, qrBase64, datosUser) {
    const tipo = factura.tipoComprobante;
    const letra = tipo === 1 ? 'A' : tipo === 6 ? 'B' : 'C';
    const esConsumidorFinal = tipo === 6;
    ////console.log("datos user desde pdf 2 ->", datosUser)
    return {
      // ✅ Usa _pdfConfig que ya viene del validador
      emisor: this._getEmisor(cuit, datosUser),
      receptor: this._getReceptor(factura, esConsumidorFinal),
      comprobante: this._getComprobante(factura, resultadoAfip, qrBase64, letra),
      items: this._getItems(factura, esConsumidorFinal),
      totales: this._getTotales(factura, esConsumidorFinal),
      pagos: {
        formaPago: factura.formaPago || 'CONTADO',
        monto: factura.importeTotal || 0
      },
      observaciones: factura.observaciones
    };
  }

  _getEmisor(cuit,datosUser ) {
   // //console.log("datos user desde pdf 3->", datosUser)
    return {
      razonSocial: datosUser.empresa.razonSocial || 'RAZÓN SOCIAL DEL EMISOR',
      cuit: this._formatearCuit(datosUser.cuit || cuit || '0'),
      domicilio: datosUser.empresa.domicilio.calle + datosUser.empresa.domicilio.numero ,
      localidad: datosUser.empresa.domicilio.localidad || 'LOCALIDAD',
      provincia: datosUser.empresa.domicilio.provincia || 'PROVINCIA',
      iibb: datosUser.empresa.datosFiscales.iibb || "iibb",
      fechaInicioActividades: datosUser.empresa.datosFiscales.fechaInicioActividades,
      // ✅ Usa métodos de consulta del validador
      condicionIVA: FacturaValidator.getCondicionIVA(1),
      categoriaMonotributo: datosUser.empresa.datosFiscales.categoriaMonotributo,
      actividadAFIP:  datosUser.empresa.datosFiscales.actividadPrincipal,
      telefono: datosUser.empresa.contacto.telefono || 'TELÉFONO',
      puntoVentaSucursal: datosUser.config.puntoVenta || 1,
    };
  }

  //agregar datos del receptor si estan en db o en factura, sino poner datos por defecto
  _getReceptor(factura, esConsumidorFinal) {
    return {
      tipoDocumento: factura.docTipo || (esConsumidorFinal ? 99 : 80),
      numeroDocumento: factura.docNro?.toString() || '0',
      razonSocial: this._getRazonSocialReceptor(factura, esConsumidorFinal),
      domicilio: factura.domicilio || (esConsumidorFinal ? '-' : 'NO ESPECIFICADO'),
      localidad: factura.localidad || '-',
      // ✅ Usa métodos de consulta del validador
      condicionIVA: FacturaValidator.getCondicionIVA(factura.condicionIVAReceptor)
    };
  }

  _getComprobante(factura, resultadoAfip, qrBase64, letra) {
    return {
      tipo: `FACTURA ${letra}`,
      codigoTipo: factura.tipoComprobante,
      puntoVenta: String(factura.puntoVenta).padStart(4, '0'),
      numero: this._formatearNumeroComprobante(factura.puntoVenta, resultadoAfip.numero),
      fecha: this._formatearFecha(factura.fecha),
      cae: resultadoAfip.cae,
      fechaVtoCae: this._formatearFecha(resultadoAfip.caeVencimiento),
      leyendaAFIP: 'Documento electrónico válido',
      qrImage: qrBase64,
      // ✅ Usa _pdfConfig que ya viene del validador
      mostrarIVA: factura._pdfConfig?.mostrarIVA || false
    };
  }

  _getItems(factura, esConsumidorFinal) {
    if (!factura.items?.length) return [];

    return factura.items.map((item, index) => {
      // ✅ Usa métodos de consulta del validador, no recalcula
      const alicuota = FacturaValidator.getAlicuotaIVA(item.ivaId || item.alicuotaIVA || 5);
      const cantidad = item.cantidad || 1;
      const precio = item.precioUnitario || 0;
      const subtotal = cantidad * precio;
      const ivaItem = esConsumidorFinal ? 0 : subtotal * (alicuota / 100);

      return {
        codigo: item.codigo || String(index + 1).padStart(4, '0'),
        descripcion: item.descripcion || 'Producto/Servicio',
        cantidad,
        precioUnitario: precio,
        alicuotaIVA: alicuota,
        importeIVA: this._redondear(ivaItem),
        subtotalSinIVA: this._redondear(subtotal),
        subtotalConIVA: this._redondear(subtotal + ivaItem)
      };
    });
  }

  _getTotales(factura, esConsumidorFinal) {
    return {
      // ✅ Usa valores ya calculados por el validador
      subtotal: factura.importeNeto || 0,
      iva: esConsumidorFinal ? 0 : (factura.importeIVA || 0),
      total: factura.importeTotal || 0,
      leyendaIVA: esConsumidorFinal ? 
        'IVA no discriminado - Consumidor Final' : 
        'IVA discriminado'
    };
  }

  _getRazonSocialReceptor(factura, esConsumidorFinal) {
    if (esConsumidorFinal) return 'CONSUMIDOR FINAL';
    if (factura.razonSocial) return factura.razonSocial;
    if (factura.docNro && factura.docNro !== '0') return `CLIENTE ${factura.docNro}`;
    return 'CONSUMIDOR FINAL';
  }

  _formatearNumeroComprobante(puntoVenta, numero) {
    return `${String(puntoVenta).padStart(4, '0')}-${String(numero).padStart(8, '0')}`;
  }

  _formatearCuit(cuit) {
    if (!cuit) return '0';
    const limpio = String(cuit).replace(/\D/g, '');
    if (limpio.length === 11) {
      return `${limpio.slice(0,2)}-${limpio.slice(2,10)}-${limpio.slice(10)}`;
    }
    return cuit;
  }

  _formatearFecha(fecha) {
    if (!fecha) return new Date().toLocaleDateString('es-AR');
    if (typeof fecha === 'string' && fecha.length === 8) {
      return `${fecha.slice(6,8)}/${fecha.slice(4,6)}/${fecha.slice(0,4)}`;
    }
    return fecha;
  }

  _redondear(valor) {
    if (valor === undefined || valor === null) return 0;
    return Math.round(Number(valor) * 100) / 100;
  }



 
}

export default new FacturaPdfPreparerService();