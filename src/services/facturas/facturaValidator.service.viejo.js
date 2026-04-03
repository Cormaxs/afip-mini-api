/**
 * Servicio de validación y corrección de facturas (Modo ARCA 2026)
 * ÚNICO servicio que puede MODIFICAR los datos de la factura
 */
export class FacturaValidatorService {
  
    procesarFactura(factura, dataUser) {
      const result = {
        factura: this._limpiarFactura({ ...factura }),
        warnings: [],
        errors: [],
        valida: true
      };
  
      // 1. Validaciones de campos base
  
      this._validarCampos(result);
      if (result.errors.length > 0) {
        result.valida = false;
        return this._logResultado(result);
      }
  
      // 2. Validación de Identidad ARCA 2026
      this._validarIdentificacionReceptor(result);
  
      const tipo = result.factura.tipoComprobante;
      const esFacturaA = tipo === 1;
      const esFacturaB = tipo === 6;
      const esFacturaC = tipo === 11;
  
      // 3. Calcular IVA desde items
      const calculos = this._calcularItems(result.factura);
      result.factura.importeNeto = calculos.importeNeto;
      result.factura.importeIVA = calculos.importeIVA;
      result.factura.importeTotal = calculos.importeTotal;
      result.factura.items = calculos.items;
  
      // 4. Aplicar configuraciones por tipo
      if (esFacturaB) {
        this._aplicarConfigFacturaB(result, calculos, dataUser);
      } else if (esFacturaA) {
        this._aplicarConfigFacturaA(result);
      } else if (esFacturaC) {
        this._aplicarConfigFacturaC(result);
      }
  
      // 5. Agregar array IVA según tipo
      result.factura.iva = this._generarArrayIva(result.factura, esFacturaA, calculos);
  
      // 6. Validaciones de consistencia y emisor
      this._validarDatosEmisor(result);
      this._validarTotales(result);
  
      // 7. Metadata y formateo final
      result.factura._metadata = {
        fechaGeneracion: new Date().toISOString(),
        version: '2026.1.0',
        entidadFiscal: 'ARCA'
      };
  
      this._formatearParaAFIP(result);
  
      return this._logResultado(result);
    }
  
    _limpiarFactura(factura) {
      const limpia = { ...factura };
      if (limpia.totales) delete limpia.totales;
      if (!limpia.emisor) limpia.emisor = {};
      if (!limpia.receptor) limpia.receptor = {};
      return limpia;
    }
  
    _validarCampos(result) {
      const f = result.factura;
      const requeridos = ['tipoComprobante', 'puntoVenta', 'importeTotal'];
      requeridos.forEach(campo => {
        if (f[campo] === undefined) result.errors.push(`Campo requerido: ${campo}`);
      });
    }
  
    _validarIdentificacionReceptor(result) {
      const f = result.factura;
      const LIMITES_2026 = 1000000;
      
      const esAnonimo = !f.receptor?.tipoDocumento || [96, 99].includes(Number(f.receptor.tipoDocumento));
  
      if (esAnonimo && f.importeTotal > LIMITES_2026) {
        result.errors.push(`ARCA 2026: Operaciones mayores a $${LIMITES_2026.toLocaleString('es-AR')} requieren identificación obligatoria (CUIT/CUIL).`);
      }
    }
  
    _calcularItems(factura) {
      const tipo = Number(factura.tipoComprobante);
      const esFacturaA = tipo === 1;
      const esFacturaB = tipo === 6;
      
      let acumuladorNeto = 0;
      let acumuladorIVA = 0;
      const detallesIVA = {};
  
      factura.items.forEach(item => {
        const idAlicuota = item.alicuotaIVA || item.AlicuotaIVA || 5;
        const tasa = this.getAlicuotaIVA(idAlicuota);
        
        const cantidad = Number(item.cantidad) || 1;
        const precio = Number(item.precioUnitario) || 0;
  
        let netoItem, ivaItem, subtotalItem;
  
        if (esFacturaA) {
          netoItem = precio * cantidad;
          ivaItem = netoItem * (tasa / 100);
          subtotalItem = netoItem + ivaItem;
          item.precioNeto = precio;
          item.precioConIVA = netoItem + ivaItem;
        } 
        else if (esFacturaB) {
          subtotalItem = precio * cantidad;
          netoItem = subtotalItem / (1 + (tasa / 100));
          ivaItem = subtotalItem - netoItem;
          item.precioNeto = netoItem / cantidad;
          item.precioConIVA = precio;
        } 
        else {
          netoItem = precio * cantidad;
          ivaItem = 0;
          subtotalItem = netoItem;
          item.precioNeto = precio;
          item.precioConIVA = precio;
        }
  
        item.importeIVA = this._redondear(ivaItem);
        item.subtotal = this._redondear(subtotalItem);
        item.tasaIVA = tasa;
        item.idAlicuotaIVA = idAlicuota;
  
        acumuladorNeto += netoItem;
        acumuladorIVA += ivaItem;
  
        if (esFacturaA && ivaItem > 0) {
          if (!detallesIVA[idAlicuota]) {
            detallesIVA[idAlicuota] = { 
              id: idAlicuota, 
              baseImponible: 0, 
              importe: 0 
            };
          }
          detallesIVA[idAlicuota].baseImponible += netoItem;
          detallesIVA[idAlicuota].importe += ivaItem;
        }
      });
  
      return {
        items: factura.items,
        importeNeto: this._redondear(acumuladorNeto),
        importeIVA: this._redondear(acumuladorIVA),
        importeTotal: this._redondear(acumuladorNeto + acumuladorIVA),
        detallesIVA
      };
    }
  
    _aplicarConfigFacturaB(result, calculos, dataUser) {
      const f = result.factura;
      
      // LEY 27.743: Régimen de Transparencia Fiscal
      const ivaFormateado = new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS' 
      }).format(calculos.importeIVA);
      
      f.observaciones = `Régimen de Transparencia Fiscal al Consumidor (Ley 27.743): IVA Contenido ${ivaFormateado}`;
  
      f._pdfConfig = {
        mostrarIVA: false,
        mostrarSubtotalNeto: false,
        tipoCalculo: 'precioFinal',
        entidad: 'ARCA'
      };
      
      f.emisor.condicionIVA = dataUser?.tipoResponsable;
    }
  
    _aplicarConfigFacturaA(result) {
      result.factura._pdfConfig = {
        mostrarIVA: true,
        mostrarSubtotalNeto: true,
        tipoCalculo: 'netoMasIVA',
        entidad: 'ARCA'
      };
      result.factura.emisor.condicionIVA = 'IVA Responsable Inscripto';
    }
  
    _aplicarConfigFacturaC(result) {
      result.factura._pdfConfig = {
        mostrarIVA: false,
        mostrarSubtotalNeto: true,
        tipoCalculo: 'sinIVA',
        entidad: 'ARCA'
      };
      
      if (result.factura.items) {
        result.factura.items.forEach(item => { 
          item.AlicuotaIVA = 3; 
        });
      }
    }
  
    _generarArrayIva(factura, esFacturaA, calculos) {
      const tipo = factura.tipoComprobante;
      
      // 📊 LOG PARA DEBUG
     // //console.log('🔍 Generando array IVA para tipo:', tipo);
      //* //console.log('   esFacturaA:', esFacturaA);
      /*//console.log('   calculos:', {
        importeNeto: calculos.importeNeto,
        importeIVA: calculos.importeIVA,
        detallesIVA: calculos.detallesIVA
      });*/
    
      // ✅ FACTURA A: Array con todas las alícuotas
      if (esFacturaA && Object.keys(calculos.detallesIVA).length > 0) {
        const ivaArray = Object.values(calculos.detallesIVA).map(v => ({
          id: v.id,
          baseImponible: this._redondear(v.baseImponible),
          importe: this._redondear(v.importe)
        }));
        //console.log('✅ Factura A - Array IVA generado:', ivaArray);
        return ivaArray;
      } 
      
      // ✅ FACTURA B: Array con id:5 y valores reales
      else if (tipo === 6) {
        const ivaArray = [{
          id: 5, // 21% (el valor real, aunque no se muestre)
          baseImponible: this._redondear(calculos.importeNeto),
          importe: this._redondear(calculos.importeIVA)
        }];
        //console.log('✅ Factura B - Array IVA generado:', ivaArray);
        return ivaArray;
      } 
      
      // ✅ FACTURA C: Array con id:3 (0%)
      else {
        const ivaArray = [{
          id: 3,
          baseImponible: this._redondear(factura.importeTotal),
          importe: 0
        }];
        //console.log('✅ Factura C - Array IVA generado:', ivaArray);
        return ivaArray;
      }
    }
  
    _validarDatosEmisor(result) {
      const f = result.factura;
      if (!f.emisor.ingresosBrutos) f.emisor.ingresosBrutos = 'N/A';
      if (!f.emisor.fechaInicioActividades) f.emisor.fechaInicioActividades = '01/01/2000';
    }
  
    _validarTotales(result) {
      const f = result.factura;
      const calculado = this._redondear((Number(f.importeNeto) || 0) + (Number(f.importeIVA) || 0));
      if (Math.abs(calculado - f.importeTotal) > 0.01) {
        f.importeTotal = calculado;
        result.warnings.push(`Total recalculado a $${f.importeTotal}`);
      }
    }
  
    _formatearParaAFIP(result) {
      const f = result.factura;
      f.puntoVenta = parseInt(f.puntoVenta) || 1;
      f.tipoComprobante = parseInt(f.tipoComprobante) || 11;
      ['importeNeto', 'importeIVA', 'importeTotal'].forEach(k => {
        f[k] = this._redondear(f[k] || 0);
      });
    }
  
    _redondear(valor) {
      if (valor === undefined || valor === null) return 0;
      return Math.round(Number(valor) * 100) / 100;
    }
  
    _logResultado(result) {
      result.valida = result.errors.length === 0;
      if (!result.valida) console.error('❌ RECHAZADO POR ARCA:', result.errors);
      return result;
    }
  
    // --- MÉTODOS PÚBLICOS DE CONSULTA (solo lectura) ---
    getAlicuotaIVA(id) {
      const alicuotas = { 
          3: 0, 4: 10.5, 5: 21, 6: 27, 
          8: 5, 9: 2.5
      };
      return alicuotas[id] || 21;
    }
  
    getCondicionIVA(codigo) {
      const condiciones = {
        1: 'Responsable Inscripto',
        4: 'Sujeto Exento',
        5: 'Consumidor Final',
        6: 'Responsable Monotributo'
      };
      return condiciones[codigo] || 'Consumidor Final';
    }
  
    getTipoDocumento(codigo) {
      const docs = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI', 99: 'Sin Identificar' };
      return docs[codigo] || 'DNI';
    }
    //agregar ver ultimo comprobante
  }
  
  export default new FacturaValidatorService();