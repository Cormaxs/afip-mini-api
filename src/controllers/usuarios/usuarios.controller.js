import {DataUser} from '../../services/user-data/userData.service.js';
import {TIPO_A_CAMPO} from '../../utils/mapeos/variables-globales.js';

const dataUser = new DataUser();


export class UsuariosController{

      //datos fiscales del usuario
  manejardatosfiscales = async (req, res) => {
    try{
      const datos = req.body;
      console.log("datos recibidos -> ", datos)
      const guardado = await dataUser.guardarDatos(datos);
      res.json({guardado});

    }catch(error){
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  obtenerdatosEmpresaId = async (req, res)=>{
    try{
      const userId = req.params.id;
      //console.log("userId para obtener datos fiscales -> ", userId);
      const datosUser = await dataUser.obtenerEmpresaUserId(userId);
      res.json({ success: true, data: datosUser });
  }
  catch(error){
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
  }

 // Actualizar datos fiscales 
 actualizarDatosFiscales = async (req, res) => {
  try {
    const userId = req.params.id;
    const datos = req.body;
    console.log("Datos para actualizar -> ", { userId, datos });
    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID de usuario requerido' });
    }
    const actualizado = await dataUser.actualizarDatos(userId, datos);
    if (!actualizado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: actualizado });
  } catch (error) {
    console.error('Error en actualizarDatosFiscales:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Eliminar usuario (DELETE)
eliminarUsuario = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID de usuario requerido' });
    }
    const eliminado = await dataUser.eliminarUsuario(userId);
    if (!eliminado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

  // los ultimos comporbantes


 // Obtener último comprobante de la BD local (ya lo tenías esbozado)
 obtenerUltimoComprobantedb = async (req, res) => {
  try {
    const { userId, puntoVenta, tipoComprobante } = req.body;
    if (!userId || !puntoVenta || !tipoComprobante) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    const counter = await dataUser.obtenerPorUsuarioYPV(userId, puntoVenta);
    if (!counter) {
      return res.json({ success: true, data: { ultimoNumero: 0 } });
    }
    // Mapear tipo a campo
    
    const campo = TIPO_A_CAMPO[tipoComprobante];
    if (!campo) return res.status(400).json({ success: false, message: 'Tipo no soportado' });
    const ultimo = counter.ultimoNumero[campo] || 0;
    res.json({ success: true, data: { puntoVenta, tipoComprobante, ultimoNumero: ultimo, name: counter.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Crear o actualizar un contador (POST)
crearOActualizarContador = async (req, res) => {
  try {
    const { userId, puntoVenta, name, ultimoNumero } = req.body;
    if (!userId || !puntoVenta || !name) {
      return res.status(400).json({ success: false, message: 'Faltan userId, puntoVenta y name' });
    }
    const result = await dataUser.crearOActualizar(userId, puntoVenta, name, ultimoNumero || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener todos los puntos de venta de un usuario (GET)
listarPuntosDeVenta = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Falta userId' });
    const puntos = await dataUser.listarPuntosDeVenta(userId);
    res.json({ success: true, data: puntos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Actualizar un número específico (PATCH)
actualizarNumero = async (req, res) => {
  try {
    const { userId, puntoVenta, tipoCampo, nuevoNumero } = req.body;
    if (!userId || !puntoVenta || !tipoCampo || nuevoNumero === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    const result = await dataUser.actualizarNumero(userId, puntoVenta, tipoCampo, nuevoNumero);
    if (!result) return res.status(404).json({ success: false, message: 'Contador no encontrado' });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Eliminar un punto de venta (DELETE)
eliminarPuntoVenta = async (req, res) => {
  try {
    const { userId, puntoVenta } = req.body;
    console.log("Datos para eliminar punto de venta -> ", { userId, puntoVenta });
    if (!userId || !puntoVenta) return res.status(400).json({ success: false, message: 'Faltan datos' });
    const result = await dataUser.eliminar(userId, puntoVenta);
    if (!result) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, message: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

sincronizarPuntosConAFIP = async (req, res) => {
  try {
    const { id, cuit, puntosVenta } = req.body; // o de los params, según prefieras
    const token = req.token; // asumiendo que viene del middleware

    if (!id || !token|| !cuit || !puntosVenta ) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }

    const resultado = await dataUser.sincronizarConAFIP(id, puntosVenta ,token.token, token.sign, cuit);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


consultarProximoNumero = async (req, res) => {
  try {
    const { userId, puntoVenta, tipoCampo } = req.body;
    if (!userId || !puntoVenta || !tipoCampo) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    const proximo = await dataUser.consultarProximoNumero(userId, puntoVenta, tipoCampo);
    res.json({ success: true, data: { proximoNumero: proximo } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

incrementarContador = async (req, res) => {
  try {
    const { userId, puntoVenta, tipoCampo } = req.body;
    if (!userId || !puntoVenta || !tipoCampo) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }
    const nuevoNumero = await dataUser.incrementarContador(userId, puntoVenta, tipoCampo);
    res.json({ success: true, data: { numeroReservado: nuevoNumero } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

}


