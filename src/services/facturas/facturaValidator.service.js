/**
 * Servicio de validación y corrección de facturas (Modo ARCA 2026)
 * ÚNICO servicio que puede MODIFICAR los datos de la factura
 * Validaciones exhaustivas y cálculos precisos con decimal.js
 */

import Decimal from 'decimal.js';
import {ALICUOTAS_IVA, CONDICIONES_IVA, CONDICION_POR_DEFECTO, TIPOS_DOCUMENTO, 
  TIPOS_COMPROBANTE, CONDICIONES_PERMITIDAS_POR_TIPO} from '../../utils/mapeos/variables-globales.js';

// Configuración global de decimal.js (precisión y redondeo comercial)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class FacturaValidatorService {
  
  // Constantes de AFIP
  static ALICUOTAS_IVA = ALICUOTAS_IVA;
  static CONDICIONES_IVA = CONDICIONES_IVA;
  static CONDICION_POR_DEFECTO = CONDICION_POR_DEFECTO;
  static TIPOS_DOCUMENTO = TIPOS_DOCUMENTO;
  static TIPOS_COMPROBANTE = TIPOS_COMPROBANTE;
  static CONDICIONES_PERMITIDAS_POR_TIPO = CONDICIONES_PERMITIDAS_POR_TIPO;



  procesarFactura(factura, dataUser) {
    const result = {
      factura: this._limpiarFactura({ ...factura }),
      warnings: [],
      errors: [],
      valida: true 
    };

    try {
      // 1. Validaciones básicas de estructura
      this._validarCamposRequeridos(result);
      if (result.errors.length > 0) {
        result.valida = false;
        return this._logResultado(result);
      }

      this._validarTipoComprobante(result);
      this._validarPuntoVenta(result);
      this._validarFecha(result);
      this._validarMoneda(result);
      this._validarDocumentoReceptor(result);
      this._validarCondicionIVAReceptor(result);
      this._validarItems(result);
      this._validarTotales(result);
      this._validarArrayIva(result);

      // 11. Completar datos del emisor desde dataUser
      if (dataUser) {
        this._completarEmisorDesdeDataUser(result, dataUser);
      }

      // 12. Aplicar configuraciones específicas por tipo (para PDF, observaciones, etc.)
      this._aplicarConfiguracionPorTipo(result, dataUser);

      // 13. Agregar metadata
      result.factura._metadata = {
        fechaGeneracion: new Date().toISOString(),
        version: '2026.1.0',
        entidadFiscal: 'ARCA'
      };

      // 14. Formateo final para AFIP (tipos numéricos)
      this._formatearParaAFIP(result);

    } catch (error) {
      result.errors.push(`Error interno del validador: ${error.message}`);
      result.valida = false;
    }

    return this._logResultado(result);
  }

  // ==========================================================================
  // Métodos privados de validación y corrección
  // ==========================================================================

  _limpiarFactura(factura) {
    const limpia = { ...factura };
    delete limpia.totales;
    delete limpia.comprobante;
    delete limpia._pdfConfig;
    if (!limpia.emisor) limpia.emisor = {};
    if (!limpia.receptor) limpia.receptor = {};
    return limpia;
  }

  _validarCamposRequeridos(result) {
    const f = result.factura;
    const camposRequeridos = [
      'tipoComprobante', 'puntoVenta', 'concepto', 
      'docTipo', 'docNro', 'importeTotal', 'moneda', 'cotizacion', 'fecha'
    ];
    camposRequeridos.forEach(campo => {
      if (f[campo] === undefined || f[campo] === null || f[campo] === '') {
        result.errors.push(`Campo requerido faltante: ${campo}`);
      }
    });

    if (!f.items || !Array.isArray(f.items) || f.items.length === 0) {
      result.errors.push('Debe incluir al menos un ítem');
    }
  }

  _validarTipoComprobante(result) {
    const tipo = Number(result.factura.tipoComprobante);
    if (!FacturaValidatorService.TIPOS_COMPROBANTE[tipo]) {
      result.errors.push(`Tipo de comprobante inválido: ${tipo}`);
    }
    result.factura.tipoComprobante = tipo;
  }

  _validarPuntoVenta(result) {
    const pv = Number(result.factura.puntoVenta);
    if (isNaN(pv) || pv < 1 || pv > 9999) {
      result.errors.push('Punto de venta debe ser un número entre 1 y 9999');
    }
    result.factura.puntoVenta = pv;
  }

  _validarFecha(result) {
    const fecha = result.factura.fecha;
    if (!/^\d{8}$/.test(fecha)) {
      result.errors.push('Fecha debe tener formato yyyymmdd');
      return;
    }
    const year = parseInt(fecha.substring(0, 4));
    const month = parseInt(fecha.substring(4, 6)) - 1;
    const day = parseInt(fecha.substring(6, 8));
    const dateObj = new Date(year, month, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month || dateObj.getDate() !== day) {
      result.errors.push('Fecha inválida');
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffTime = dateObj - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const concepto = Number(result.factura.concepto) || 1;
    const limite = concepto === 1 ? 5 : 10;
    if (Math.abs(diffDays) > limite) {
      result.warnings.push(`Fecha fuera del rango recomendado de ±${limite} días. AFIP podría rechazarla.`);
    }
  }

  _validarMoneda(result) {
    const moneda = result.factura.moneda;
    if (!moneda || moneda !== 'PES') {
      result.warnings.push('Moneda distinta de PES puede requerir cotización especial');
    }
    const cotizacion = Number(result.factura.cotizacion) || 1;
    if (cotizacion <= 0) {
      result.errors.push('Cotización debe ser mayor a 0');
    }
    result.factura.cotizacion = cotizacion;
  }

  _validarDocumentoReceptor(result) {
    const docTipo = Number(result.factura.docTipo);
    const docNro = String(result.factura.docNro).trim();
    if (!FacturaValidatorService.TIPOS_DOCUMENTO[docTipo]) {
      result.errors.push(`Tipo de documento inválido: ${docTipo}`);
    }
    if (docTipo === 80 && !/^\d{11}$/.test(docNro)) {
      result.errors.push('CUIT debe tener 11 dígitos');
    } else if (docTipo === 96 && !/^\d{7,8}$/.test(docNro)) {
      result.warnings.push('DNI debe tener 7 u 8 dígitos');
    }
    result.factura.docTipo = docTipo;
    result.factura.docNro = docNro;
  }

  _validarCondicionIVAReceptor(result) {
    const tipo = result.factura.tipoComprobante;
    let condicion = Number(result.factura.condicionIVAReceptor);
    const permitidas = FacturaValidatorService.CONDICIONES_PERMITIDAS_POR_TIPO[tipo] || [];

    if (!condicion || isNaN(condicion)) {
      condicion = FacturaValidatorService.CONDICION_POR_DEFECTO[tipo] || 5;
      result.warnings.push(`Condición IVA del receptor no especificada, se asume ${condicion}`);
    }

    if (!permitidas.includes(condicion)) {
      const valorAnterior = condicion;
      condicion = FacturaValidatorService.CONDICION_POR_DEFECTO[tipo] || 5;
      result.warnings.push(`Condición IVA del receptor ${valorAnterior} no permitida para tipo ${tipo}. Se corrigió a ${condicion}`);
    }

    result.factura.condicionIVAReceptor = condicion;
  }

  _validarItems(result) {
    const tipo = result.factura.tipoComprobante;
    const esFacturaA = tipo === 1;
    const esFacturaB = tipo === 6;
    const esFacturaC = tipo === 11;

    let acumNeto = new Decimal(0);
    let acumIVA = new Decimal(0);
    const detallesIVA = {};

    result.factura.items = result.factura.items.map((item, index) => {
      const itemValidado = { ...item };

      const idAlicuota = Number(item.alicuotaIVA) || 5;
      if (!FacturaValidatorService.ALICUOTAS_IVA[idAlicuota]) {
        result.errors.push(`Item ${index + 1}: alícuota IVA ${idAlicuota} inválida`);
      }
      const tasa = new Decimal(FacturaValidatorService.ALICUOTAS_IVA[idAlicuota] || 21);

      const cantidad = new Decimal(item.cantidad || 1);
      if (cantidad.lessThanOrEqualTo(0)) {
        result.errors.push(`Item ${index + 1}: cantidad debe ser mayor a 0`);
      }
      const precioUnitario = new Decimal(item.precioUnitario || 0);
      if (precioUnitario.lessThan(0)) {
        result.errors.push(`Item ${index + 1}: precio unitario no puede ser negativo`);
      }

      let netoItem, ivaItem, subtotalItem;

      if (esFacturaA) {
        netoItem = precioUnitario.times(cantidad);
        ivaItem = netoItem.times(tasa.div(100));
        subtotalItem = netoItem.plus(ivaItem);
        itemValidado.precioNeto = precioUnitario.toNumber();
        itemValidado.precioConIVA = subtotalItem.toNumber();
      } else if (esFacturaB) {
        subtotalItem = precioUnitario.times(cantidad);
        netoItem = subtotalItem.div(tasa.div(100).plus(1));
        ivaItem = subtotalItem.minus(netoItem);
        itemValidado.precioNeto = netoItem.div(cantidad).toNumber();
        itemValidado.precioConIVA = precioUnitario.toNumber();
      } else {
        netoItem = precioUnitario.times(cantidad);
        ivaItem = new Decimal(0);
        subtotalItem = netoItem;
        itemValidado.precioNeto = precioUnitario.toNumber();
        itemValidado.precioConIVA = precioUnitario.toNumber();
      }

      itemValidado.cantidad = cantidad.toNumber();
      itemValidado.precioUnitario = precioUnitario.toNumber();
      itemValidado.importeIVA = this._redondear(ivaItem);
      itemValidado.subtotal = this._redondear(subtotalItem);
      itemValidado.tasaIVA = tasa.toNumber();
      itemValidado.idAlicuotaIVA = idAlicuota;

      acumNeto = acumNeto.plus(netoItem);
      acumIVA = acumIVA.plus(ivaItem);

      if ((esFacturaA || esFacturaB) && ivaItem.greaterThan(0)) {
        if (!detallesIVA[idAlicuota]) {
          detallesIVA[idAlicuota] = {
            id: idAlicuota,
            baseImponible: new Decimal(0),
            importe: new Decimal(0)
          };
        }
        detallesIVA[idAlicuota].baseImponible = detallesIVA[idAlicuota].baseImponible.plus(netoItem);
        detallesIVA[idAlicuota].importe = detallesIVA[idAlicuota].importe.plus(ivaItem);
      }

      return itemValidado;
    });

    result.factura.importeNeto = this._redondear(acumNeto);
    result.factura.importeIVA = this._redondear(acumIVA);
    result.factura.importeTotal = this._redondear(acumNeto.plus(acumIVA));

    result._detallesIVA = Object.fromEntries(
      Object.entries(detallesIVA).map(([id, vals]) => [
        id,
        {
          id: parseInt(id),
          baseImponible: this._redondear(vals.baseImponible),
          importe: this._redondear(vals.importe)
        }
      ])
    );
  }

  _validarTotales(result) {
    const f = result.factura;
    const neto = new Decimal(f.importeNeto || 0);
    const iva = new Decimal(f.importeIVA || 0);
    const calculado = this._redondear(neto.plus(iva));
    if (Math.abs(calculado - f.importeTotal) > 0.01) {
      f.importeTotal = calculado;
      result.warnings.push(`Total recalculado a ${f.importeTotal}`);
    }
  }

  _validarArrayIva(result) {
    const tipo = result.factura.tipoComprobante;
    const detalles = result._detallesIVA || {};
    let ivaArray = [];

    if (tipo === 1 || tipo === 6) {
      ivaArray = Object.values(detalles).map(v => ({
        id: v.id,
        baseImponible: this._redondear(v.baseImponible),
        importe: this._redondear(v.importe)
      }));
    } else if (tipo === 11) {
      ivaArray = [];
    } else {
      ivaArray = Object.values(detalles).map(v => ({
        id: v.id,
        baseImponible: this._redondear(v.baseImponible),
        importe: this._redondear(v.importe)
      }));
    }

    result.factura.iva = ivaArray;
    delete result._detallesIVA;
  }

  /**
   * Completa los datos del emisor con la información del usuario (dataUser)
   */
  _completarEmisorDesdeDataUser(result, dataUser) {
    const empresa = dataUser.empresa || {};
    const domicilio = empresa.domicilio || {};
    const datosFiscales = empresa.datosFiscales || {};
    const contacto = empresa.contacto || {};
    const config = dataUser.config || {};

    result.factura.emisor = {
      razonSocial: empresa.razonSocial || '',
      cuit: empresa.cuit || '',
      domicilio: `${domicilio.calle || ''} ${domicilio.numero || ''}`.trim(),
      localidad: domicilio.localidad || '',
      provincia: domicilio.provincia || '',
      iibb: datosFiscales.iibb || 'N/A',
      fechaInicioActividades: datosFiscales.fechaInicioActividades || '01/01/2000',
      condicionIVA: dataUser.tipoResponsable || '',
      categoriaMonotributo: datosFiscales.categoriaMonotributo || 'N/A',
      actividadAFIP: datosFiscales.actividadPrincipal || '',
      telefono: contacto.telefono || '',
      puntoVentaSucursal: config.puntoVenta || 1,
    };
  }

  _aplicarConfiguracionPorTipo(result, dataUser) {
    const tipo = result.factura.tipoComprobante;
    const f = result.factura;

    switch (tipo) {
      case 1: // Factura A
        f._pdfConfig = {
          mostrarIVA: true,
          mostrarSubtotalNeto: true,
          tipoCalculo: 'netoMasIVA',
          entidad: 'ARCA'
        };
        f.emisor.condicionIVA = dataUser?.tipoResponsable || 'Responsable Inscripto';
        break;
      case 6: // Factura B
        {
          const ivaFormateado = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
          }).format(f.importeIVA);
          f.observaciones = `Régimen de Transparencia Fiscal al Consumidor (Ley 27.743): IVA Contenido ${ivaFormateado}`;
          f._pdfConfig = {
            mostrarIVA: false,
            mostrarSubtotalNeto: false,
            tipoCalculo: 'precioFinal',
            entidad: 'ARCA'
          };
          f.emisor.condicionIVA = dataUser?.tipoResponsable;
        }
        break;
      case 11: // Factura C
        f._pdfConfig = {
          mostrarIVA: false,
          mostrarSubtotalNeto: true,
          tipoCalculo: 'sinIVA',
          entidad: 'ARCA'
        };
        f.emisor.condicionIVA = dataUser?.tipoResponsable;
        break;
      default:
        f._pdfConfig = {
          mostrarIVA: true,
          mostrarSubtotalNeto: true,
          tipoCalculo: 'netoMasIVA',
          entidad: 'ARCA'
        };
    }

    // Asegurar valores por defecto en campos del emisor (por si no se asignaron antes)
    if (!f.emisor.iibb) f.emisor.iibb = 'N/A';
    if (!f.emisor.fechaInicioActividades) f.emisor.fechaInicioActividades = '01/01/2000';
    
   // console.log("f.emisor.iibb -> ", f.emisor.iibb, "f.emisor.fechaInicioActividades -> ", f.emisor.fechaInicioActividades);
  }

  _formatearParaAFIP(result) {
    const f = result.factura;
    f.puntoVenta = Number(f.puntoVenta);
    f.tipoComprobante = Number(f.tipoComprobante);
    f.importeNeto = this._redondear(f.importeNeto);
    f.importeIVA = this._redondear(f.importeIVA);
    f.importeTotal = this._redondear(f.importeTotal);
    f.cotizacion = Number(f.cotizacion) || 1;
    delete f._pdfConfig;
  }

  _redondear(valor) {
    if (valor === undefined || valor === null) return 0;
    return new Decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  _logResultado(result) {
    result.valida = result.errors.length === 0;
    if (!result.valida) {
      console.error('❌ RECHAZADO POR ARCA:', result.errors);
    } else if (result.warnings.length > 0) {
      console.warn('⚠️ ADVERTENCIAS:', result.warnings);
    }
    return result;
  }

  // Métodos públicos de consulta
  getAlicuotaIVA(id) {
    return FacturaValidatorService.ALICUOTAS_IVA[id] || 21;
  }

  getCondicionIVA(codigo) {
    return FacturaValidatorService.CONDICIONES_IVA[codigo] || 'Consumidor Final';
  }

  getTipoDocumento(codigo) {
    return FacturaValidatorService.TIPOS_DOCUMENTO[codigo] || 'DNI';
  }
}

export default new FacturaValidatorService();