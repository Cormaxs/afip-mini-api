import dotenv from 'dotenv';
import 'dotenv/config'; // ← PRIMERO
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import indexRoutes from './src/routes/index.js';
import mongoose from 'mongoose';


// Configuración inicial
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
  


const app = express();

// ============================================
// CONEXIÓN A MONGODB rapida
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin-db:proyectoFinal@45.236.128.209:27017/tp_final_nodo?authSource=tp_final_nodo';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB exitosamente');
    console.log('📁 Base de datos: tp_final_nodo');
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1); // Salir si no hay conexión a DB
  });

// Manejo de eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Error en conexión MongoDB:', error);
});


// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));



// Rutas
app.use('/api', indexRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════╗
  ║   🚀 AFIP Backend Listo        ║
  ║   📡 Puerto: ${PORT}                    ║
  ║   📁 Storage: ${process.env.STORAGE_PATH}   ║
  ╚════════════════════════════════╝
  `);
});

export default app;