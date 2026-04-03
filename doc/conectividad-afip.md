# verificar si los servidores de afip estan funcionales

## verifica si afip funciona y si mi TA es valido

post

```bash
/api/afip/acceso/verificar
```

body

```json
{
    "id": "689a697d9061e531213a7842",
    "cuit": "20437813702"
}
```

respuesta

```json
{
    "success": true,
    "message": "✅ Acceso confirmado - TA vigente y operativo",
    "datos": {
        "servicio": "wsfe",
        "cuit": "20437813702",
        "taExpiracion": "2026-02-20T22:09:44.992-03:00",
        "minutosRestantes": 414,
        "timestamp": "2026-02-20T18:15:20.673Z"
    }
}
```

Lo que hace es mandar una peticion a afip, con una consulta publica que no requiera facturacion.
