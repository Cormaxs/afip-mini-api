# Documentacion escencial

## Estructura de carpetas 

```json
src/
├── controllers/
│   └── afip.controller.js      # Controladores con los 4 endpoints
├── routes/
│   └── afip.routes.js          # Rutas de la API
├── services/
│   ├── afip.service.js         # Servicio principal orquestador
│   └── wsaa.service.js         # Servicio de autenticación WSAA
└── utils/
    ├── date.utils.js           # Utilidades de fechas
    ├── file.utils.js           # Manejo de archivos
    ├── openssl.utils.js        # Comandos OpenSSL
    ├── soap.utils.js           # Cliente SOAP
    ├── ta.utils.js             # Utilidades de Ticket de Acceso
    └── wsfe.utils.js            # Utilidades de facturación
```

### documentacion 

[README.md](../readme.md) - Documentación principal

[API.md](./API.md) - Documentación de endpoints

[TECH.md](./TECH.md) - Documentación técnica

[conectividad-afip](./conectividad-afip.md) - verificacion de servidores de afip funcionando