import { AfipService } from '../../services/certificados/certificados.service.js';
import {PadronService} from '../../services/afip-general/padron.service-mongo.js';
import { ParametrosService } from '../../services/afip-general/parametros.service.js'; 


const padronService = new PadronService();
const afipService = new AfipService();
const parametrosService = new ParametrosService();




export class AfipController {
  // Paso 1: Generar clave privada y CSR
  generarCertificado = async (req, res) => {
    try {
      const { id, datos } = req.body;
      //console.log(id, datos)
      if (!id || !datos) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan id o datos del certificado' 
        });
      }

      const resultado = await afipService.generarKeyYCSR(id, datos);
        //console.log(resultado)
      res.json({
        success: true,
        message: '✅ Key y CSR generados exitosamente',
        data: {
          csr: resultado.csr,
          key: resultado.privateKey
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };
 
  // Paso 2: Guardar certificado firmado por AFIP
  guardarCertificado = async (req, res) => {
    try {
      const { id, certificado } = req.body;
      
      if (!id || !certificado) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan id o contenido del certificado' 
        });
      }

      const ruta = await afipService.guardarCertificado(id, certificado);
      
      res.json({
        success: true,
        message: '✅ Certificado guardado correctamente',
        data: { ruta }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  // Paso 3: Obtener Ticket de Acceso
  obtenerTicketAcceso = async (req, res) => {
    try {
      console.log("datos recibidos -> ", req.body)
      const { id, cuit, servicio = 'wsfe' } = req.body;
      
      if (!id || !cuit) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan id o cuit' 
        });
      }

      const ta = await afipService.obtenerTicketAcceso(id, cuit, servicio);
      
      res.json({
        success: true,
        message: '✅ Ticket de acceso obtenido',
        data: ta
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };




// verifico acceso afip - ta
verificarAcceso = async (req, res) => {
  try {
    const { id, cuit, servicio} = req.body;
    
    if (!id || !cuit) {
      return res.status(400).json({
        success: false,
        error: 'Faltan id o cuit'
      });
    }

    const resultado = await afipService.verificarAccesoConTAActual(id, cuit, servicio);
    res.json({
      success: true,
      message: 'acceso verificado',
      data: resultado
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};




// 1. Obtener TA específico para el padrón
obtenerTAPadron = async (req, res) => {
  try {
    const { id, cuit, servicio } = req.body;
    
    if (!id || !cuit) {
      return res.status(400).json({
        success: false,
        error: 'Faltan id o cuit'
      });
    }

    const resultado = await padronService.obtenerTAPadron(id, cuit, servicio);
    res.json({
      success: true,
      message: 'token obtenido para el padrón',
      data: resultado
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 2. Consultar CUIT usando el TA del padrón
consultarCUIT = async (req, res) => {
  try {
    const { id, cuit, cuitAConsultar } = req.body;
    
    if (!id || !cuit || !cuitAConsultar) {
      return res.status(400).json({
        success: false,
        error: 'Faltan id, cuit o cuitAConsultar'
      });
    }

    if (!/^\d{11}$/.test(cuitAConsultar)) {
      return res.status(400).json({
        success: false,
        error: 'El CUIT a consultar debe tener 11 dígitos'
      });
    }

    const resultado = await padronService.consultarCUIT(id, cuit, cuitAConsultar);
    res.json({
      success: true,
      message: 'consulta exitosa del padrón',
      data: resultado
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 3. Limpiar caché del padrón
limpiarCachePadron = async (req, res) => {
  try {
    const resultado = padronService.limpiarCache();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// ============================================
  // MÉTODOS DE PARÁMETROS
  // ============================================
  
  obtenerTiposComprobante = async (req, res) => {
    try {
      const { id, cuit } = req.body;
      const token = req.token; // Viene del middleware
      
      const resultado = await parametrosService.obtenerTiposComprobante(
        token.token, token.sign, cuit
      );
      
      res.json({ success: true,  message: 'obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  obtenerTiposConcepto = async (req, res) => {
    try {
      const { id, cuit } = req.body;
      const token = req.token;
      
      const resultado = await parametrosService.obtenerTiposConcepto(
        token.token, token.sign, cuit
      );
      
      res.json({ success: true, message: 'obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  obtenerTiposDocumento = async (req, res) => {
    try {
      const { id, cuit } = req.body;
      const token = req.token;
      
      const resultado = await parametrosService.obtenerTiposDocumento(
        token.token, token.sign, cuit
      );
      
      res.json({ success: true, message: 'obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  obtenerTiposIva = async (req, res) => {
    try {
      const { id, cuit } = req.body;
      const token = req.token;
      
      const resultado = await parametrosService.obtenerTiposIva(
        token.token, token.sign, cuit
      );
      
      res.json({ success: true, message: 'obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  obtenerTiposMoneda = async (req, res) => {
    try {
      const { id, cuit } = req.body;
      const token = req.token;
      
      const resultado = await parametrosService.obtenerTiposMoneda(
        token.token, token.sign, cuit
      );
      
      res.json({ success: true, message: 'obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  obtenerUltimoComprobante = async (req, res) => {
    try {
      const { id, cuit, puntoVenta, tipoComprobante } = req.body;
      const token = req.token;
      console.log("desde el backend -> ",req.body)
      const resultado = await parametrosService.obtenerUltimoComprobante(
        token.token, token.sign, cuit, puntoVenta, tipoComprobante
      );
      
      res.json({ success: true, message: 'comprobante obtenido con exito', data: resultado });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };


//recuperar CAE
   consultarFactura = async (req, res) => {
  try {
    const { puntoVenta, tipoComprobante, numeroFactura, cuit ,id} = req.body;
    // 1. Obtener token vigente
    const auth = await afipService.obtenerTicketAcceso(id, cuit, 'wsfe');
    
    // 2. Consultar el comprobante
    const resultado = await parametrosService.consultarComprobante(
      auth.token,
      auth.sign,
      auth.cuit,
      puntoVenta,
      tipoComprobante,
      numeroFactura
    );

    /*
    if (resultado.success) {
      // Opcional: buscar en tu BD para comparar
      const facturaLocal = await facturaRepository.buscarFacturaPorNumero(
        puntoVenta,
        tipoComprobante,
        numero,
        id
      );
*/
      res.json({
        success: true,
        message: 'factura consultada con exito',
        data: resultado.comprobante
        //local: facturaLocal || null
      });
      /*
    } else {
      res.status(400).json(resultado);
    }*/
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

}

