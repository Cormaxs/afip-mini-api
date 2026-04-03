import express from "express";
import { UsuariosController } from '../controllers/usuarios/usuarios.controller.js';
import { tokenRenovationMiddleware } from '../middlewares/tokenRenovation.middleware.js';

const usuario = express.Router();
const usuariosController = new UsuariosController();

//datos de empresa fiscales
usuario.post('/datos-fiscales', usuariosController.manejardatosfiscales);
usuario.post('/datos-fiscales/:id', usuariosController.actualizarDatosFiscales);//actualizar dtos
usuario.get('/datos-fiscales/:id', usuariosController.obtenerdatosEmpresaId);
usuario.delete('/datos-fiscales/:id', usuariosController.eliminarUsuario);
 
// Nuevas rutas para comprobantes
usuario.post('/comprobantes/ultimo-db', usuariosController.obtenerUltimoComprobantedb);
usuario.post('/comprobantes/contador', usuariosController.crearOActualizarContador);
usuario.get('/comprobantes/puntos/:userId', usuariosController.listarPuntosDeVenta);
usuario.post('/comprobantes/numero', usuariosController.actualizarNumero);
usuario.delete('/comprobantes/contador', usuariosController.eliminarPuntoVenta);
usuario.post('/comprobantes/sincronizar',tokenRenovationMiddleware, usuariosController.sincronizarPuntosConAFIP);


// Nueva ruta para obtener próximo número atómicamente
usuario.post('/comprobantes/proximo-numero', usuariosController.consultarProximoNumero);
usuario.post('/comprobantes/incrementar-contador', usuariosController.incrementarContador);


export default usuario;