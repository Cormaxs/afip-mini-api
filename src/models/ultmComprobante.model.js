import mongoose from 'mongoose';

const comprobanteCounterSchema = new mongoose.Schema({
  // Propietario (usuario)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataUser',
    required: true,
    index: true
  },
  // Punto de venta
  puntoVenta: {
    type: Number,
    required: true,
    min: 1,
    max: 9999
  },
  name:{
    type: String,
    required: true
  },
  // Contadores para todos los tipos de comprobante
  ultimoNumero: {
    // Facturas
    facturaA: { type: Number, default: 0 },
    facturaB: { type: Number, default: 0 },
    facturaC: { type: Number, default: 0 },
    // Notas de crédito (disminuyen o cancelan importe)
    notaCreditoA: { type: Number, default: 0 },
    notaCreditoB: { type: Number, default: 0 },
    notaCreditoC: { type: Number, default: 0 },
    // ✅ Notas de débito (aumentan importe)
    notaDebitoA: { type: Number, default: 0 },
    notaDebitoB: { type: Number, default: 0 },
    notaDebitoC: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Índice único para evitar duplicados de (userId, puntoVenta)
comprobanteCounterSchema.index({ userId: 1, puntoVenta: 1 }, { unique: true });

export const ComprobanteCounter = mongoose.model('ComprobanteCounter', comprobanteCounterSchema);