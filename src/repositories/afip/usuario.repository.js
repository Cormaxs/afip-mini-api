import { User } from '../../models/dataUser.model.js';
import {ComprobanteCounter} from '../../models/ultmComprobante.model.js';


export class UsuarioRepository{
    //guardar datos de usaurio en db
async guardarDatosUser(datos){
    try {
      const user = new User(datos);
      await user.save();
      //console.log('✅ Datos de usuario guardados en DB');
      return user;
    } catch (error) {
      console.error('❌ Error guardando datos de usuario:', error);
      throw error;
    }
  }
  
  async obtenerDatosEmpresa(userId){
  try{
    const user = await User.findById(userId);
    //console.log(User)
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    return user;
  
  }catch(error){
    console.error('❌ Error obteniendo datos de usuario:', error);
    throw error;
  }
  }

 // Actualizar
 async actualizarDatosUser(userId, datos) {
  try {
    const user = await User.findByIdAndUpdate(userId, datos, { new: true, runValidators: true });
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    //console.log('✅ Datos de usuario actualizados en DB');
    return user;
  } catch (error) {
    console.error('❌ Error actualizando datos de usuario:', error);
    throw error;
  }
}

// Eliminar
async eliminarDatosUser(userId) {
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    //console.log('✅ Usuario eliminado de DB');
    return user;
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    throw error;
  }
}




  //ultimas facturas de afip

  //buscar por punto de venta
  async findByUserAndPuntoVenta(userId, puntoVenta) {
    return await ComprobanteCounter.findOne({ userId, puntoVenta });
  }

  //buscar comprobante por userid
  async findByUser(userId) {
    return await ComprobanteCounter.find({ userId }).sort({ puntoVenta: 1 });
  }

  //crear punto de venta con las ultimas facturas o actulizarlas si existen
  async createOrUpdate(userId, puntoVenta, name, ultimoNumero = {}) {
    // ultimoNumero es un objeto con los campos a actualizar (parcial)
    const update = {
      name,
      ...Object.keys(ultimoNumero).reduce((acc, key) => {
        acc[`ultimoNumero.${key}`] = ultimoNumero[key];
        return acc;
      }, {})
    };
    return await ComprobanteCounter.findOneAndUpdate(
      { userId, puntoVenta },
      { $set: update },
      { upsert: true, new: true }
    );
  }

//ver bien si es redundante y eliminar luego
  async updateCounter(userId, puntoVenta, tipoCampo, nuevoNumero) {
    // tipoCampo: 'facturaA', 'notaCreditoB', etc.
    return await ComprobanteCounter.findOneAndUpdate(
      { userId, puntoVenta },
      { $set: { [`ultimoNumero.${tipoCampo}`]: nuevoNumero } },
      { new: true }
    );
  }

  //eliminar el punto de venta
  async deleteCounter(userId, puntoVenta) {
    return await ComprobanteCounter.findOneAndDelete({ userId, puntoVenta });
  }



  async consultarProximoNumero(userId, puntoVenta, tipoCampo) {
    const doc = await ComprobanteCounter.findOne({ userId, puntoVenta });
    if (!doc) {
      // Si no existe el contador, el próximo número es 1
      return 1;
    }
    return doc.ultimoNumero[tipoCampo] + 1;
  }

  async incrementarContador(userId, puntoVenta, tipoCampo) {
    const result = await ComprobanteCounter.findOneAndUpdate(
      { userId, puntoVenta },
      { $inc: { [`ultimoNumero.${tipoCampo}`]: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return result.ultimoNumero[tipoCampo];
  }

} 