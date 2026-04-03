
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // ===== DATOS DE LA EMPRESA (para el PDF) =====
  empresa: {
    // Datos básicos
    razonSocial: { type: String, required: true },
    cuit: { type: String, required: true, unique: true, match: /^\d{11}$/ },
    tipoResponsable: { 
      type: String, 
      enum: ['RI', 'M', 'E', 'CF', 'NR'], // RI=Responsable Inscripto, M=Monotributista, E=Exento, CF=Consumidor Final, NR=No Responsable
      required: true 
    },
    
    // Domicilio fiscal
    domicilio: {
      calle: { type: String, required: true },
      numero: { type: String, required: true },
      piso: String,
      depto: String,
      localidad: { type: String, required: true },
      provincia: { type: String, required: true },
      codigoPostal: { type: String, required: true }
    },
    
    // Datos fiscales adicionales (para el PDF)
    datosFiscales: {
      iibb: String,                       // Número de Ingresos Brutos
      fechaInicioActividades: Date,        // Fecha de inicio
      actividadPrincipal: String,          // Descripción de actividad AFIP
      categoriaMonotributo: {              // Solo para Monotributistas
        type: String,
        enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'N/A'],
        default: 'N/A'
      }
    },
    
    // Contacto
    contacto: {
      email: { type: String, required: true, lowercase: true, trim: true, required: false },
      telefono: String,
      celular: { 
        type: String,
        match: /^[0-9]{10,15}$/,
        sparse: true
      },
      website: String
    },
    
    // Personalización del PDF
    personalizacion: {
      logo: String,                        // URL del logo
      sucursal: { type: String, default: 'Principal' }
    }
  },

  // ===== CONFIGURACIÓN TÉCNICA (para AFIP) =====
  config: {
    certificadoActivo: { type: Boolean, default: false },
    fechaVencimientoCert: { type: Date },
    idCertificadoEnBD: { type: mongoose.Schema.Types.ObjectId, ref: 'AfipCert' },
    entorno: { type: String, enum: ['homo', 'prod'], default: 'homo' },
    puntoVenta: { type: Number, default: 1 },
    proximoNumero: {
      type: Map,
      of: Number,
      default: {
        '1': 0,  // Factura A
        '6': 0,  // Factura B
        '11': 0  // Factura C
      }
    }
  },

  // ===== ESTADÍSTICAS =====
  stats: {
    totalTokens: { type: Number, default: 0 },
    lastTokenAt: { type: Date },
    totalFacturas: { type: Number, default: 0 },
    totalFacturado: { type: Number, default: 0 }
  }

}, { timestamps: true });


// Índices para mejorar el rendimiento de consultas comunes
userSchema.index({ 'empresa.razonSocial': 1 });
userSchema.index({ 'empresa.tipoResponsable': 1 });
userSchema.index({ 'empresa.domicilio.provincia': 1 });
userSchema.index({ 'empresa.domicilio.localidad': 1 });
userSchema.index({ 'empresa.datosFiscales.iibb': 1 });
userSchema.index({ 'empresa.datosFiscales.categoriaMonotributo': 1 });
userSchema.index({ 'config.puntoVenta': 1 });
userSchema.index({ 'config.entorno': 1 });
userSchema.index({ 'config.certificadoActivo': 1 });
userSchema.index({ 'config.fechaVencimientoCert': 1 });
userSchema.index({ 'stats.totalFacturas': -1 });
userSchema.index({ 'stats.totalFacturado': -1 });
userSchema.index({ 'createdAt': -1 });
userSchema.index({ 'updatedAt': -1 });
userSchema.index({ "empresa.contacto.email": 1 }, { unique: true, sparse: true });

export const User = mongoose.model('DataUser', userSchema);