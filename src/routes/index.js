import expres from 'express';
import usuario  from './usuario.routes.js';;
import facturas from './facturas.routes.js';
import afip from './afip.routes.js';


const indexRoutes = expres.Router();

indexRoutes.use('/facturas',facturas );
indexRoutes.use('/usuario', usuario);
indexRoutes.use('/afip', afip);

export default indexRoutes;
