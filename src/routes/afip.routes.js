import { Router } from 'express';
import { AfipController } from '../controllers/afip/afip.controller.js';
import { tokenRenovationMiddleware } from '../middlewares/tokenRenovation.middleware.js';

const afip = Router();
const controller = new AfipController();

// Rutas certificados
afip.post('/certificado/generar', controller.generarCertificado);//genera csr
afip.post('/certificado/guardar', controller.guardarCertificado); //guarda el certificado generado en afip

afip.post('/ticket/acceso', tokenRenovationMiddleware, controller.obtenerTicketAcceso);//pide TA wsfe

//verifico acceso a afip
afip.post('/acceso/verificar',tokenRenovationMiddleware, controller.verificarAcceso);

// ============================================
// NUEVAS RUTAS PARA EL PADRÓN (todo bajo /api/afip)
// ============================================
afip.post('/padron/ticket/obtener', tokenRenovationMiddleware, controller.obtenerTAPadron);
afip.post('/cuit/consultar', tokenRenovationMiddleware, controller.consultarCUIT);
afip.post('/padron/cache/limpiar', tokenRenovationMiddleware, controller.limpiarCachePadron);

// ============================================
// NUEVAS RUTAS PARA CONSULTAS (parametros para facturacion)
// ============================================
afip.post('/parametros/tipos-comprobante', tokenRenovationMiddleware, controller.obtenerTiposComprobante);
afip.post('/parametros/tipos-concepto', tokenRenovationMiddleware, controller.obtenerTiposConcepto);
afip.post('/parametros/tipos-documento', tokenRenovationMiddleware, controller.obtenerTiposDocumento);
afip.post('/parametros/tipos-iva', tokenRenovationMiddleware, controller.obtenerTiposIva);
afip.post('/parametros/tipos-moneda', tokenRenovationMiddleware, controller.obtenerTiposMoneda);
afip.post('/parametros/ultimo-comprobante', tokenRenovationMiddleware, controller.obtenerUltimoComprobante);


afip.post('/parametros/CAE', tokenRenovationMiddleware, controller.consultarFactura)




export default afip;