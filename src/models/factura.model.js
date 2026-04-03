// models/factura.model.js
import mongoose from 'mongoose';

const facturaSchema = new mongoose.Schema({
  // Referencia al usuario
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataUser', required: true, index: true },
  
  // ✅ ESTADOS BÁSICOS
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'],
    default: 'PENDIENTE',
    required: true,
    index: true
  },
  
  // Motivo (para rechazadas o anuladas)
  motivo: {
    type: String,
    required: function() {
      return this.estado === 'RECHAZADA' || this.estado === 'ANULADA';
    }
  },
  
  // Detalle de errores (para rechazadas)
  errores: [{
    codigo: String,
    mensaje: String
  }],
  
  // Datos de AFIP (lo que se devolvió)
  afip: {
    cae: { type: String, index: true },
    caeVencimiento: String,
    numero: { type: Number, required: true },
    puntoVenta: { type: Number, required: true },
    tipoComprobante: { type: Number, required: true },
    resultado: { type: String, enum: ['A', 'R'] },
    fechaEmision: { type: Date, required: false }
  },
  
  // Datos del emisor (adaptado a tu estructura)
  emisor: {
    razonSocial: String,
    cuit: String,
    domicilio: String,
    localidad: String,
    provincia: String,
    iibb: String,
    fechaInicioActividades: Date,
    condicionIVA: String,
    categoriaMonotributo: String,
    actividadAFIP: String,
    telefono: String,
    puntoVentaSucursal: Number
  },
  
  // Datos del receptor
  receptor: {
    tipoDocumento: Number,
    numeroDocumento: String,
    razonSocial: String,
    domicilio: String,
    localidad: String,
    condicionIVA: String
  },
  
  // Datos del comprobante (adaptado a tu estructura)
  comprobante: {
    tipo: String,
    codigoTipo: Number,
    letra: String,
    puntoVenta: String,
    numero: String,
    fecha: String,  // Guardamos como string porque viene '04/03/2026'
    fechaObj: Date, // Versión Date para búsquedas
    cae: String,
    fechaVtoCae: String,
    leyendaAFIP: String,
    qrImage: String,
    mostrarIVA: Boolean,
    moneda: { type: String, default: 'PES' },
    cotizacion: { type: Number, default: 1 }
  },
  
  // Items (adaptado a tu estructura)
  items: [{
    codigo: String,
    descripcion: String,
    cantidad: Number,
    precioUnitario: Number,
    alicuotaIVA: Number,
    importeIVA: Number,
    subtotalSinIVA: Number,
    subtotalConIVA: Number
  }],
  
  // Totales (adaptado a tu estructura)
  totales: {
    subtotal: Number,
    iva: Number,
    total: Number,
    leyendaIVA: String
  },
  
  // Pagos
  pagos: {
    formaPago: String,
    monto: Number
  },
  
  // Otros
  formaPago: String,
  observaciones: String,
  
  // Metadatos
  metadata: {
    pdfGenerado: { type: Boolean, default: false },
    pdfPath: String,
    qrCode: String,
    fechaGeneracionPDF: Date
  }
  
}, { 
  timestamps: true,
  // Permitir campos no definidos en el schema (opcional)
  strict: false 
});


// Índices
facturaSchema.index({ userId: 1, createdAt: -1 });
facturaSchema.index({ estado: 1, userId: 1 });
facturaSchema.index({ 'afip.cae': 1 });
facturaSchema.index({ 'receptor.numeroDocumento': 1 });
facturaSchema.index({ 'comprobante.fechaObj': 1 });


export const Factura = mongoose.model('Factura', facturaSchema);