// models/afipCert.model.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const afipCertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataUser', required: true, index: true },
  privateKey: { type: String, required: true },
  csr: { type: String, required: true }, // 👈 CSR ahora es requerido (se guarda en paso 1)
  certificate: { type: String, required: false },
  entorno: { type: String, enum: ['homo', 'prod'], default: 'homo', index: true },
  fechaVencimiento: { type: Date, index: true },
  alias: { type: String },
  activo: { type: Boolean, default: true, index: true },
  metadata: {
    commonName: String,
    organization: String,
    cuit: String,
    email: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
afipCertSchema.index({ userId: 1, activo: 1, entorno: 1 });
afipCertSchema.index({ fechaVencimiento: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual para saber si está vencido
afipCertSchema.virtual('isExpired').get(function() {
  return this.fechaVencimiento && this.fechaVencimiento < new Date();
});

// Buscar certificado activo
afipCertSchema.statics.findActivo = function(userId, entorno) {
  return this.findOne({
    userId,
    entorno,
    activo: true,
    $or: [
      { fechaVencimiento: { $gt: new Date() } },
      { fechaVencimiento: null }
    ]
  });
};

export const AfipCert = mongoose.model('AfipCert', afipCertSchema);