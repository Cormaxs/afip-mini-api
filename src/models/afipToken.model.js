// models/afipToken.model.js
import mongoose from 'mongoose';

const afipTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataUser', required: true, index: true },
  service: { 
    type: String, 
    required: true, 
    enum: ['wsfe', 'ws_sr_padron_a5', 'ws_sr_constancia_inscripcion'],
    index: true 
  },
  token: { type: String, required: true },
  sign: { type: String, required: true },
  expirationTime: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para evitar duplicados
afipTokenSchema.index({ userId: 1, service: 1 }, { unique: true });

// Virtual para saber si está expirado
afipTokenSchema.virtual('isExpired').get(function() {
  return this.expirationTime < new Date();
}); 

// Virtual para tiempo restante en minutos
afipTokenSchema.virtual('minutesRemaining').get(function() {
  if (this.isExpired) return 0;
  return Math.round((this.expirationTime - new Date()) / 60000);
});

// Buscar token vigente
afipTokenSchema.statics.findVigente = function(userId, service) {
  return this.findOne({
    userId,
    service,
    expirationTime: { $gt: new Date() }
  });
};

// Eliminar tokens expirados
afipTokenSchema.statics.removeExpired = function() {
  return this.deleteMany({
    expirationTime: { $lt: new Date() }
  });
};

export const AfipToken = mongoose.model('AfipToken', afipTokenSchema);


