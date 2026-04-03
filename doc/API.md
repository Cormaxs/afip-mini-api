# rutas de API

## 🔐 Autenticación

La API no requiere autenticación externa. Utiliza certificados digitales almacenados localmente.

---

## 1️⃣ Generar Key y CSR

Genera clave privada y solicitud de certificado (CSR) para un usuario.

**Endpoint:** `POST /certificado/generar`

### Body Request

```json
{
  "id": "689a697d9061e531213a784a", //id de base de datos (user_id)
  "datos": { // datos escenciales para un certificado valido por afip
    "country": "AR",
    "state": "BuenosAires",
    "locality": "CABA",
    "organization": "MiEmpresaSA",
    "organizationalUnit": "Sistemas",
    "emailAddress": "test@test.com",
    "cuit": "20437813702" //debe ir en el formato sin guiones
  }
}
```

## Response Exitosa (200)

```bash
{
  "success": true,
  "message": "✅ Key y CSR generados exitosamente",
  "data": {
    "csr": "-----BEGIN CERTIFICATE REQUEST-----\nMIIC+zCCAWMCAQAw...\n-----END CERTIFICATE REQUEST-----",
    "keyPath": "storage/users/689a697d9061e531213a784a/afip/private.key",
    "csrPath": "storage/users/689a697d9061e531213a784a/afip/request.csr"
  }
}
```

## Códigos de Error

```bash
Código              Descripción
400                 Faltan id o datos del certificado
500                 Error generando certificados
```

## 2️⃣ Guardar Certificado

Guarda el certificado firmado por AFIP.

```bash
Endpoint: POST /certificado/guardar
```

Body Request

```bash
{
  "id": "689a697d9061e531213a784a",
  "certificado": "-----BEGIN CERTIFICATE-----\nMIIDRzCCAi+gAwIBAgIINKZjq/3+15Mw...\n-----END CERTIFICATE-----"
}
```

Response Exitosa (200)

```bash
{
  "success": true,
  "message": "✅ Certificado guardado correctamente",
  "data": {
    "ruta": "storage/users/689a697d9061e531213a784a/afip/certificate.crt"
  }
}
```

### Validaciones

* El certificado debe contener "BEGIN CERTIFICATE"
* Se verifica formato antes de guardar.

## 3️⃣ Obtener Ticket de Acceso

Obtiene Ticket de Acceso (TA) de AFIP para un servicio.

```bash
Endpoint: POST /ticket/acceso
```

Body Request

```bash
{
  "id": "689a697d9061e531213a784a",
  "cuit": "20437813702",
  "servicio": "wsfe"
}
```

Response Exitosa (200)

```bash
{
  "success": true,
  "message": "✅ Ticket de acceso obtenido",
  "data": {
    "token": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3Nv...",
    "sign": "HK4c2n8KqE3qX5yLm9pQr7sT2vB4nM6jK8hG1dF3jU5yW7zR9tA...",
    "expiration": "2026-02-20T15:30:45.000Z",
    "cuit": 20437813702,
    "servicio": "wsfe"
  }
}
```

### Flujo Interno

1) Genera Ticket de Requerimiento (TRA)

2) Firma con clave privada

3) Codifica a Base64

4) Envía a WSAA

5) Parsea respuesta

6) Limpia archivos temporales

## 4️⃣ Solicitar CAE

Solicita Código de Autorización Electrónico para una factura.

````bash
Endpoint: POST /factura/cae
````

Body Request

```bash
{
  "id": "689a697d9061e531213a784a",
  "cuit": "20437813702",
  "factura": {
    "puntoVenta": 1,
    "tipo": 1,
    "numeroDocumento": "20437813702",
    "importeNeto": 10000,
    "importeIVA": 2100,
    "importeTotal": 12100
  }
}
```

Response Exitosa (200)

```bash
{
  "success": true,
  "message": "✅ CAE obtenido",
  "data": {
    "cae": "71012345678901",
    "vencimiento": "20260322",
    "numero": 1,
    "resultado": "A"
  }
}
```

## 5️⃣ Consultar Factura

Consulta el estado de una factura emitida.

````bash 
Endpoint: GET /factura/:id
````

Query Parameters

```bash
GET /factura/689a697d9061e531213a784a?cuit=20437813702&puntoVenta=1&tipo=1&numero=1
```

```json
Parámetro           Descripción
id                  ID del usuario (path)
cuit                CUIT del emisor
puntoVenta          Número de punto de venta
tipo                Tipo de comprobante
numero              Número de factura
```

Response Exitosa (200)

```bash
{
  "success": true,
  "data": {
    "cuit": "20437813702",
    "puntoVenta": 1,
    "tipo": 1,
    "numero": 1,
    "estado": "Aprobada",
    "fecha": "2026-02-20T15:30:45.000Z"
  }
}
```
