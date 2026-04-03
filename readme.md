# AFIP Backend - Integración con AFIP/ARCA

Backend en Node.js para integración con los servicios web de AFIP/ARCA. Permite generar certificados digitales, obtener tickets de acceso y facturación electrónica.

[indice](./doc/index.md)

## ✨ Características

- ✅ Generación de clave privada y CSR
- ✅ Gestión de certificados digitales
- ✅ Obtención de Ticket de Acceso (TA) vía WSAA
- ✅ Preparado para facturación electrónica (WSFEv1)
- ✅ Estructura modular y escalable
- ✅ Soporte para múltiples usuarios
- ✅ Entornos de homologación y producción

## 📋 Requisitos Previos

- Node.js 18+
- OpenSSL instalado en el sistema
- CUIT válido en AFIP/ARCA
- Certificado digital (para producción)

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone ...

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# 4. Iniciar el servidor
npm run dev

```

## 🔧 Configuración

Variables de Entorno (.env)

```bash
PORT=3001
NODE_ENV=development
STORAGE_PATH=./storage
AFIP_PRODUCTION=false  # false = homologación, true = producción
```

## Estructura de Carpetas

```bash
afip-backend/
├── src/
│   ├── controllers/     # Controladores de endpoints
│   ├── routes/          # Definición de rutas
│   ├── services/        # Lógica de negocio
│   │   ├── afip.service.js
│   │   └── wsaa.service.js
│   └── utils/           # Utilidades
│       ├── date.utils.js
│       ├── file.utils.js
│       ├── openssl.utils.js
│       ├── soap.utils.js
│       └── wsfe.utils.js
├── storage/             # Almacenamiento de archivos
│   └── users/           # Datos por usuario
├── .env
└── app.js
```

## 📡 Endpoints API

```bash
Método      Endpoint                        Descripción
POST      /api/afip/certificado/generar	    Genera key y CSR
POST      /api/afip/certificado/guardar	    Guarda certificado
POST      /api/afip/ticket/acceso	Obtiene     Ticket de Acceso
POST      /api/afip/factura/cae	            Solicita CAE
GET        /api/afip/factura/:id	            Consulta factura
```

## 📦 Dependencias

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "morgan": "^1.10.0",
    "soap": "^1.0.0",
    "xml2js": "^0.6.2",
    "axios": "^1.6.0",
    "xmlbuilder": "^15.1.1"
  }
}
```

## 🚦 Scripts Disponibles

```bash
npm run dev     # Inicia en modo desarrollo (con nodemon)
npm start       # Inicia en modo producción
npm test        # Ejecuta tests
```

## 🔒 Seguridad

+ Las claves privadas NUNCA salen del servidor

+ Los certificados se almacenan encriptados

+ Validación de formato de certificados

+ Limpieza automática de archivos temporales

## 🌐 Entornos

## Homologación (Pruebas)

* AFIP_PRODUCTION=false

* URLs de prueba de AFIP

* Certificados de homologación

## Producción

* AFIP_PRODUCTION=true

* URLs productivas de AFIP

* Certificados reales

## 🤝 Contribuir

* Fork el proyecto

* Crear rama feature (git checkout -b feature/AmazingFeature)

* Commit cambios (git commit -m 'Add AmazingFeature')

* Push (git push origin feature/AmazingFeature)

* Abrir Pull Request

✉️ Contacto
cormaxs

Link del proyecto: https://github.com