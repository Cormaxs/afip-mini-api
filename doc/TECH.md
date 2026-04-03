# Documentación Técnica - Backend AFIP

Afip no utiliza [JSON](https://es.wikipedia.org/wiki/Json), sino [SOAP](https://es.wikipedia.org/wiki/Simple_Object_Access_Protocol).

## 📁 Estructura de Carpetas


```text
src/
├── controllers/ # Controladores (reciben requests HTTP)
│ └── afip.controller.js
├── models/ # Modelos de MongoDB
│ ├── afipCert.model.js # Certificados (key, csr, crt)
│ ├── afipToken.model.js # Tokens de acceso (TA)
│ └── dataUser.model.js # Usuarios
├── repositories/ # Capa de acceso a datos
│ └── afip.repository.js
├── routes/ # Definición de rutas Express
│ └── afip.routes.js
├── services/ # Lógica de negocio
│ ├── afip.service-mongo.js # Servicio principal (WSFE)
│ ├── padron.service-mongo.js # Servicio de consulta de CUIT
│ └── wsaa.service-mongo.js # Servicio de autenticación (WSAA)
└── utils/ # Utilidades
├── date.utils.js # Manejo de fechas para AFIP
└── openssl.utils.crypto.js # Operaciones criptográficas (node-forge)

```

## 🔄 Flujo Completo de Comunicación con AFIP

```mermaid
graph TD
    A[Frontend] -->|1. POST /certificado/generar| B[afip.controller.js]
    B --> C[afip.service.js: generarKeyYCSR]
    C --> D[openssl.utils.crypto.js: generarKeyYCSR]
    D --> E[Genera KEY y CSR en memoria]
    E --> F[afip.repository.js: guardarKeyYCSR]
    F --> G[(MongoDB)]
    G --> H[Devuelve CSR al frontend]
    H --> I[Usuario carga CSR en AFIP web]
    I --> J[AFIP devuelve certificado .crt]
    J --> K[Frontend envía certificado]
    K -->|2. POST /certificado/guardar| L[afip.controller.js]
    L --> M[afip.service.js: guardarCertificado]
    M --> N[openssl.utils.crypto.js: extraerFechaVencimiento]
    N --> O[afip.repository.js: guardarCertificado]
    O --> P[(MongoDB)]
  ```

## Obtención de Ticket de Acceso (TA)

```mermaid
graph TD
    A[Frontend] -->|POST /ticket/acceso| B[afip.controller.js]
    B --> C[afip.service.js: obtenerTicketAcceso]
    C --> D{¿Token vigente en DB?}
    D -->|Sí| E[Devuelve token guardado]
    D -->|No| F[afip.repository.js: obtenerKeyYCertificado]
    F --> G[(MongoDB)]
    G --> H[wsaa.service.js: generarTRAXML]
    H --> I[Genera TRA]
    I --> J[openssl.utils.crypto.js: crearCMSFirmado]
    J --> K[Firma TRA con KEY y CERT]
    K --> L[wsaa.service.js: llamarWSAAconBase64]
    L --> M[AFIP WSAA]
    M --> N[Devuelve TA]
    N --> O[wsaa.service.js: parsearRespuestaTA]
    O --> P[afip.repository.js: guardarToken]
    P --> Q[(MongoDB)]
    Q --> R[Devuelve token al frontend]
   ```

## Consulta de CUIT (Padrón)

```mermaid
graph TD
    A[Frontend] -->|POST /padron/cuit/consultar| B[padron.controller.js]
    B --> C[padron.service.js: consultarCUIT]
    C --> D[afip.repository.js: obtenerTokenVigente]
    D --> E[(MongoDB)]
    E --> F{¿Token vigente?}
    F -->|No| G[Devuelve error: necesita nuevo TA]
    F -->|Sí| H{¿En caché?}
    H -->|Sí| I[Devuelve datos cacheados]
    H -->|No| J[Consulta a AFIP]
    J --> K[AFIP WSSrPadronA5]
    K --> L[Procesa respuesta]
    L --> M[Guarda en caché]
    M --> N[Devuelve datos]
  ```

## 📦 Flujo de Datos por Servicio

### WSAA Service (wsaa.service-mongo.js)

```js
// Responsabilidad: Autenticación contra AFIP
- generarTRAXML(service)     // Genera el Ticket de Requerimiento
- llamarWSAAconBase64(cms)   // Envía CMS firmado a WSAA
- parsearRespuestaTA(xml)    // Parsea respuesta y extrae token+sign
```

### AFIP Service (afip.service-mongo.js)

```js
// Responsabilidad: Facturación electrónica (WSFE)
- generarKeyYCSR()           // Paso 1: Genera key y CSR
- guardarCertificado()       // Paso 2: Guarda certificado .crt
- obtenerTicketAcceso()      // Paso 3: Obtiene/maneja TA
- verificarAccesoConTAActual() // Verifica TA vigente
- solicitarCAE()             // (Pendiente) Obtener CAE
```

### Padrón Service (padron.service-mongo.js)

```js
// Responsabilidad: Consulta de CUIT (ws_sr_padron_a5)
- obtenerTAPadron()          // Obtiene TA específico para padrón
- consultarCUIT()            // Consulta datos de un CUIT
- limpiarCache()             // Limpia caché de resultados
```

