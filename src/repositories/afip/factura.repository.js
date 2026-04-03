import {Factura} from '../../models/factura.model.js';
import {FacturaPdfPreparerService} from '../../services/facturas/facturaPdfPreparer.service.js';

const facturaPdfPreparerService = new FacturaPdfPreparerService();

export class FacturaRepository{
//save data factura in db xd, to in english
async guardarFactura(facturaData, userId) {
    try {
      //console.log("facturaData -> factura.repository ->", facturaData);
      // Construir el objeto a guardar según el modelo
      const facturaParaGuardar = {
        userId,
        estado: 'PENDIENTE',
        // Datos de AFIP (parciales)
        afip: {
          puntoVenta: facturaData.puntoVenta,
          tipoComprobante: facturaData.tipoComprobante,
          numero: facturaData.numeroFactura,
          // fechaEmision la pondremos después
        },
        // Emisor: tomamos del facturaData.emisor y completamos con datos del usuario si es necesario
        emisor: {
          condicionIVA: facturaData.emisor?.condicionIVA,
          iibb: facturaData.emisor?.iibb,
          fechaInicioActividades: facturaData.emisor?.fechaInicioActividades
          // Podríamos obtener más datos del usuario (razonSocial, cuit, etc.) desde la base de datos
          // Pero aquí solo tenemos facturaData, así que lo dejamos así
        },
        // Receptor
        receptor: {
          tipoDocumento: facturaData.docTipo,
          numeroDocumento: facturaData.docNro?.toString(),
          condicionIVA: facturaData.condicionIVAReceptor ? 
            (facturaData.condicionIVAReceptor === 1 ? 'Responsable Inscripto' : 'Consumidor Final') : undefined,
          // razonSocial podría venir en facturaData.receptor?.razonSocial, pero no está
        },
        // Comprobante
        comprobante: {
          tipo: facturaData.tipoComprobante === 1 ? 'FACTURA A' : facturaData.tipoComprobante === 6 ? 'FACTURA B' : 'FACTURA C',
          codigoTipo: facturaData.tipoComprobante,
          letra: facturaData.tipoComprobante === 1 ? 'A' : facturaData.tipoComprobante === 6 ? 'B' : 'C',
          puntoVenta: String(facturaData.puntoVenta).padStart(4, '0'),
          numero: `${String(facturaData.puntoVenta).padStart(4, '0')}-${String(facturaData.numeroFactura).padStart(8, '0')}`,
          fecha: facturaData.fecha, // viene como string yyyymmdd
          moneda: facturaData.moneda,
          cotizacion: facturaData.cotizacion,
        },
        // Items
        items: facturaData.items.map(item => ({
          codigo: item.codigo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioNeto || item.precioUnitario,
          alicuotaIVA: item.tasaIVA, // o item.alicuotaIVA?
          importeIVA: item.importeIVA,
          subtotalSinIVA: item.precioNeto * item.cantidad,
          subtotalConIVA: item.subtotal,
        })),
        // Totales
        totales: {
          subtotal: facturaData.importeNeto,
          iva: facturaData.importeIVA,
          total: facturaData.importeTotal,
        },
        // Otros
        formaPago: facturaData.formaPago || 'CONTADO', // o lo que corresponda
        
        // Guardar configuraciones y metadata en un campo genérico
        metadata: {
          pdfConfig: facturaData._pdfConfig,
          metadata: facturaData._metadata,
        }
      };
  
      const factura = new Factura(facturaParaGuardar);
      await factura.save();
      //console.log('✅ Factura guardada en DB con estado PENDIENTE');
      return factura;
    } catch (error) {
      console.error('❌ Error guardando factura:', error);
      throw error;
    }
  }
  
  
  //guardar datos de afip
  async actualizarFacturaConAfip(facturaId, resultadoAfip, qrBase64) {
    try {
     // //console.log("resultadoAfip.caeVencimiento", resultadoAfip.caeVencimiento)
      const update = {
        estado: resultadoAfip.success ? 'APROBADA' : 'RECHAZADA',
        'afip.cae': resultadoAfip.cae,
        'afip.caeVencimiento': resultadoAfip.caeVencimiento,
        'afip.resultado': resultadoAfip.resultado,
        'afip.fechaEmision': new Date(),
        'metadata.qrCode': qrBase64,  // ← guardamos el QR
      };
      if (resultadoAfip.errores) {
        update.errores = resultadoAfip.errores;
        update.motivo = 'Factura rechazada por AFIP';
      }
      return await Factura.findByIdAndUpdate(facturaId, update, { new: true });
    } catch (error) {
      console.error('❌ Error actualizando factura:', error);
      throw error;
    }
  }
  
  //anular factura, guardando una nota de crédito relacionada a la factura original en db antes de mandar a afip
  async guardarNotaCredito(facturaOriginal, notaCreditoData, userId) {
    try {
      const numeroNC = facturaOriginal.numeroNotaCredito || facturaOriginal.numeroFactura; // si usas ese nombre
      // Calcular subtotalSinIVA a partir de precioUnitario * cantidad
      const items = facturaOriginal.items.map(item => {
        const precioNeto = item.precioNeto || item.precioUnitario; // Usamos precioNeto si existe, sino precioUnitario
        return {
          codigo: item.codigo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          alicuotaIVA: item.tasaIVA || (item.alicuotaIVA === 5 ? 21 : item.alicuotaIVA === 4 ? 10.5 : 0),
          importeIVA: item.importeIVA,
          subtotalSinIVA: precioNeto * item.cantidad,
          subtotalConIVA: item.subtotal,
        };
      });
  
      // Construir el objeto para la NC
      const ncParaGuardar = {
        userId,
        estado: 'PENDIENTE',
        // Datos de AFIP (parciales, se completarán después)
        afip: {
          puntoVenta: notaCreditoData.puntoVenta,
          tipoComprobante: notaCreditoData.tipoComprobante,
          numero: numeroNC,   // <-- asignar el número
          // numero se obtendrá después
        },
        // Emisor: tomamos de la factura original o dejamos campos básicos
        emisor: {
          condicionIVA: facturaOriginal.emisor?.condicionIVA,
          // Podríamos completar con datos del usuario si los tenemos
        },
        // Receptor (mismo que la factura original)
        receptor: {
          tipoDocumento: facturaOriginal.docTipo,
          numeroDocumento: facturaOriginal.docNro?.toString(),
          condicionIVA: facturaOriginal.condicionIVAReceptor ? 
            (facturaOriginal.condicionIVAReceptor === 1 ? 'Responsable Inscripto' : 'Consumidor Final') : undefined,
        },
        // Comprobante
        comprobante: {
          tipo: notaCreditoData.tipoComprobante === 3 ? 'NOTA DE CRÉDITO A' : 
                notaCreditoData.tipoComprobante === 8 ? 'NOTA DE CRÉDITO B' : 'NOTA DE CRÉDITO C',
          codigoTipo: notaCreditoData.tipoComprobante,
          letra: notaCreditoData.tipoComprobante === 3 ? 'A' : 
                 notaCreditoData.tipoComprobante === 8 ? 'B' : 'C',
          puntoVenta: String(notaCreditoData.puntoVenta).padStart(4, '0'),
          // El número formateado lo pondremos después, cuando tengamos el número real
          numero: `${String(notaCreditoData.puntoVenta).padStart(4, '0')}-${String(numeroNC).padStart(8, '0')}`,
          fecha: notaCreditoData.fecha,
          moneda: notaCreditoData.moneda,
          cotizacion: notaCreditoData.cotizacion,
        },
        // Items
        items,
        // Totales
        totales: {
          subtotal: facturaOriginal.importeNeto,
          iva: facturaOriginal.importeIVA,
          total: facturaOriginal.importeTotal,
        },
        // Relación con la factura original
        relaciones: {
          facturaOrigen: facturaOriginal._id // Asumimos que facturaOriginal tiene _id
        },
        // Otros
        formaPago: 'CONTADO',
        observaciones: `Anulación de factura N° ${facturaOriginal.numero}`,
        metadata: {
          esAnulacion: true,
          facturaOriginalId: facturaOriginal._id,
          pdfGenerado: false,
        }
      };
  
      const nc = new Factura(ncParaGuardar);
      await nc.save();
      //console.log('✅ Nota de crédito guardada en DB con estado PENDIENTE, ID:', nc._id);
      return nc;
    } catch (error) {
      console.error('❌ Error guardando nota de crédito:', error);
      throw error;
    }
  }
  
  
  // Actualizar la nota de crédito y la factura original tras la respuesta de AFIP
  async actualizarAnulacionConAfip(ncId, facturaOriginal, resultadoAfip, notaCreditoData) {
    try {
      //console.log("afip.repository -> notaCreditoData.punto venta", notaCreditoData)
      // 1. Actualizar la nota de crédito
      const updateNC = {
        estado: resultadoAfip.success ? 'APROBADA' : 'RECHAZADA',
        'afip.cae': resultadoAfip.cae,
        'afip.caeVencimiento': resultadoAfip.caeVencimiento,
        'afip.numero': resultadoAfip.numero,
        'afip.resultado': resultadoAfip.resultado,
        'afip.fechaEmision': new Date(),
      };
  
      // Si fue rechazada, guardamos errores
      if (!resultadoAfip.success && resultadoAfip.errores) {
        updateNC.errores = resultadoAfip.errores;
        updateNC.motivo = 'Nota de crédito rechazada por AFIP';
      }
  
      // Actualizar también el número formateado en comprobante
      if (resultadoAfip.success) {
        updateNC['comprobante.numero'] = `${String(notaCreditoData.puntoVenta).padStart(4, '0')}-${String(resultadoAfip.numero).padStart(8, '0')}`;
      }
  
      const ncActualizada = await Factura.findByIdAndUpdate(ncId, updateNC, { new: true });
  
      // 2. Si la NC fue aprobada, actualizar la factura original a ANULADA
      if (resultadoAfip.success) {
        const updateOriginal = {
          estado: 'ANULADA',
          motivo: 'Anulada por nota de crédito',
          anulacion: {
            fecha: new Date(),
            motivo: 'NOTA_CREDITO',
            notaCreditoId: ncId,
          },
        };
        // Opcional: agregar la NC a un array de notas de crédito si el campo existe
        // Podríamos usar $push si el modelo tiene un array 'notasCredito'
        await Factura.findByIdAndUpdate(facturaOriginal._id, {
          ...updateOriginal,
          $push: { 'relaciones.notasCredito': ncId }
        });
      }
  
      //console.log(`✅ Anulación actualizada: NC ${resultadoAfip.numero || 'sin número'} - ${updateNC.estado}`);
      return ncActualizada;
    } catch (error) {
      console.error('❌ Error actualizando anulación:', error);
      throw error;
    }
  }
  

//no anda todavia
  async buscarFacturaPorNumero(puntoVenta, tipoComprobante, numero, userId) {
    try {
      const factura = await Factura.findOne({
        userId,
        'afip.puntoVenta': Number(puntoVenta),
        'afip.tipoComprobante': Number(tipoComprobante),
        'afip.numero': Number(numero)
      });
      return factura;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

//busca facturas por ID
  async buscarFacturaPorId(facturaId) {
    try {
      const factura = await Factura.findById(facturaId)
        .populate('userId', 'empresa.razonSocial empresa.cuit empresa.domicilio empresa.contacto'); // opcional
      if (!factura) {
        //console.log('Factura no encontrada');
        return null;
      }
      //console.log('Factura encontrada:', factura._id);
      return factura;
    } catch (error) {
      console.error('❌ Error buscando factura:', error);
      throw error;
    }
  }


  //formatea la factura encpontrada por ID para que pueda regenerar el pdf
  async generarPDFDesdeFactura(facturaId) {
    const factura = await this.buscarFacturaPorId(facturaId);
    if (!factura) throw new Error('Factura no encontrada');
  
    // 1. Construir facturaParaPDF (formato que espera _prepararDatosPDF)
    const facturaParaPDF = {
      tipoComprobante: factura.afip.tipoComprobante,
      puntoVenta: factura.afip.puntoVenta,
      fecha: factura.comprobante.fecha,
      items: factura.items.map(item => ({
        codigo: item.codigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        alicuotaIVA: item.alicuotaIVA, // ya es porcentaje
        importeIVA: item.importeIVA,
      })),
      importeNeto: factura.totales.subtotal,
      importeIVA: factura.totales.iva,
      importeTotal: factura.totales.total,
      formaPago: factura.formaPago,
      docTipo: factura.receptor.tipoDocumento,
      docNro: factura.receptor.numeroDocumento,
      condicionIVAReceptor: factura.receptor.condicionIVA === 'Responsable Inscripto' ? 1 : 2,
      _pdfConfig: factura.metadata?.pdfConfig,
      observaciones: factura.observaciones,
      domicilio: factura.receptor.domicilio,
      localidad: factura.receptor.localidad,
      razonSocial: factura.receptor.razonSocial,
    };
  
    // 2. Resultado de AFIP
    const resultadoAfip = {
      cae: factura.afip.cae,
      caeVencimiento: await facturaPdfPreparerService._formatearFecha(factura.afip.caeVencimiento),
      numero: factura.afip.numero,
      resultado: factura.afip.resultado,
    };
  
    // 3. Datos del usuario (estructura que espera el preparador)
    const datosUser = {
      empresa: {
        razonSocial: factura.userId.empresa.razonSocial,
        cuit: factura.userId.empresa.cuit,
        domicilio: factura.userId.empresa.domicilio, // objeto con calle, numero, localidad, provincia
        datosFiscales: {
          iibb: factura.emisor.iibb, // desde factura.emisor
          fechaInicioActividades: factura.emisor.fechaInicioActividades,
          categoriaMonotributo: factura.emisor.categoriaMonotributo || 'N/A',
          actividadPrincipal: factura.emisor.actividadAFIP || 'NO ESPECIFICADA',
        },
        contacto: factura.userId.empresa.contacto, // objeto con telefono
      },
      config: factura.userId.config, // objeto con puntoVenta
    };
  
    // 4. QR guardado
    const qrBase64 = factura.metadata.qrCode;
  
    return {
      facturaParaPDF,
      resultadoAfip,
      cuit: factura.userId.empresa.cuit,
      userId: factura.userId._id,
      datosUser,
      qrBase64,
    };
  }



  async buscarFacturas(filtros = {}, paginacion = {}) {
    try {
      const { userId, estado, tipoComprobante, desde, hasta, numero, puntoVenta, cuitReceptor, cae } = filtros;
      const { page = 1, limit = 10 } = paginacion;
  
      const query = {};
  
      // Filtro obligatorio
      if (userId) query.userId = userId;
  
      // Filtros opcionales
      if (estado) query.estado = estado;
      if (tipoComprobante) query['afip.tipoComprobante'] = Number(tipoComprobante);
      if (puntoVenta) query['afip.puntoVenta'] = Number(puntoVenta);
      if (numero) query['afip.numero'] = Number(numero);
      if (cuitReceptor) query['receptor.numeroDocumento'] = cuitReceptor;
      if (cae) query['afip.cae'] = cae;
  
      // Rango de fechas (usamos createdAt, podrías usar fecha de comprobante si prefieres)
      if (desde || hasta) {
        query.createdAt = {};
        if (desde) query.createdAt.$gte = new Date(desde);
        if (hasta) query.createdAt.$lte = new Date(hasta);
      }
  
      const total = await Factura.countDocuments(query);
  
      const facturas = await Factura.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('userId', 'empresa.razonSocial empresa.cuit'); // opcional
  
      return {
        facturas,
        paginacion: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en buscarFacturas:', error);
      throw error;
    }
  }
 
}