
import {UsuarioRepository} from '../../repositories/afip/usuario.repository.js';
import { ParametrosService } from '../../services/afip-general/parametros.service.js'; // ajusta ruta

const parametrosService = new ParametrosService();
const usuarioRepository = new UsuarioRepository();


export class DataUser{
    guardarDatos(datosUser){
        //console.log("datos enviados")
        const guardado = usuarioRepository.guardarDatosUser(datosUser);
        //console.log(guardado);
        return guardado;
    }

    obtenerEmpresaUserId(idUser){
        const datosUser = usuarioRepository.obtenerDatosEmpresa(idUser);
        return datosUser;
    }

 // Actualizar
 async actualizarDatos(userId, datos) {
  return await usuarioRepository.actualizarDatosUser(userId, datos);
}

// Eliminar
async eliminarUsuario(userId) {
  return await usuarioRepository.eliminarDatosUser(userId);
}



//ultimos comprobantes por punto de venta

    async obtenerPorUsuarioYPV(userId, puntoVenta) {
        return await usuarioRepository.findByUserAndPuntoVenta(userId, puntoVenta);
      }
    
      async listarPuntosDeVenta(userId) {
        return await usuarioRepository.findByUser(userId);
      }
    
      async crearOActualizar(userId, puntoVenta, name, ultimoNumero) {
        return await usuarioRepository.createOrUpdate(userId, puntoVenta, name, ultimoNumero);
      }
    
      async actualizarNumero(userId, puntoVenta, tipoCampo, nuevoNumero) {
        return await usuarioRepository.updateCounter(userId, puntoVenta, tipoCampo, nuevoNumero);
      }
    
      async eliminar(userId, puntoVenta) {
        return await usuarioRepository.deleteCounter(userId, puntoVenta);
      }

      //requiere token, sign y cuit para consultar a AFIP
      async sincronizarConAFIP(userId, puntosVenta, token, sign, cuit) {
        // puntosVenta: array de objetos { puntoVenta: number, name: string }
        if (!puntosVenta || !Array.isArray(puntosVenta) || puntosVenta.length === 0) {
          throw new Error('Debe proporcionar al menos un punto de venta');
        }
      
        // Obtener datos del usuario (para el CUIT)
        const user = await usuarioRepository.obtenerDatosEmpresa(userId); 
       // console.log(user.empresa.cuit)
        if (!user) throw new Error('Usuario no encontrado');
        cuit = user.empresa.cuit; // o user.empresa.cuit
      
        const tipoMap = {
          1: 'facturaA', 6: 'facturaB', 11: 'facturaC',
          3: 'notaCreditoA', 8: 'notaCreditoB', 13: 'notaCreditoC',
          2: 'notaDebitoA', 7: 'notaDebitoB', 12: 'notaDebitoC'
        };
      
        const resultados = [];
      
        for (const { puntoVenta, name } of puntosVenta) {
          const actualizaciones = {};
      
          // Para cada tipo de comprobante, consultar AFIP
          for (const [tipoStr, campo] of Object.entries(tipoMap)) {
            const tipo = parseInt(tipoStr);
            try {
              const ultimo = await parametrosService.obtenerUltimoComprobante(
                token, sign, cuit, puntoVenta, tipo
              );
              if (ultimo && ultimo.CbteNro !== undefined) {
                actualizaciones[campo] = ultimo.CbteNro;
              }
            } catch (error) {
              console.error(`Error consultando AFIP (PV ${puntoVenta}, tipo ${tipo}):`, error.message);
              // continuamos con el siguiente tipo
            }
          }
      
          // Crear o actualizar el contador local
          const updated = await usuarioRepository.createOrUpdate(
            userId, puntoVenta, name, actualizaciones
          );
          resultados.push(updated);
        }
      
        return resultados;
      }



    

      async consultarProximoNumero(userId, puntoVenta, tipoCampo) {
        return await usuarioRepository.consultarProximoNumero(userId, puntoVenta, tipoCampo);
      }
      
      async incrementarContador(userId, puntoVenta, tipoCampo) {
        return await usuarioRepository.incrementarContador(userId, puntoVenta, tipoCampo);
      }
    }