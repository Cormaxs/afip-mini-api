import express from "express";
import { FacturasController } from '../controllers/facturas/facturas.controller.js';
import { tokenRenovationMiddleware } from '../middlewares/tokenRenovation.middleware.js';

const facturas = express.Router();
const facturtacontroller = new FacturasController();


//facturar 
facturas.post('/crear', tokenRenovationMiddleware, facturtacontroller.crearFacturaElectronica);

// Ruta para anular (genera Nota de Crédito)
facturas.post('/anular', tokenRenovationMiddleware, facturtacontroller.anularFactura);

facturas.get('/recuperarFactura/:facturaId', facturtacontroller.GenerarNuevaFacturaPDf);

facturas.post('/reintentar/:idFactura', tokenRenovationMiddleware, facturtacontroller.reintentarFactura);


facturas.get('/buscar', facturtacontroller.buscarFacturas);
export default facturas;