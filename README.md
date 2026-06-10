# Iris Dubs Landing Page

Landing page para el portafolio personal de Iris Dubs, lista para desplegar en Railway.

## Estructura

- `index.html`: pagina principal con HTML, CSS y JavaScript integrado.
- `server.js`: servidor Node que sirve la pagina y procesa el formulario de contacto.
- `Material_Clasificado/`: imagenes y recursos visuales usados por la pagina.

## Railway

Railway detecta `package.json` y ejecuta:

```bash
npm start
```

Para activar el formulario con Resend, configurar estas variables en Railway:

- `RESEND_API_KEY`: API key privada de Resend.
- `CONTACT_FROM_EMAIL`: remitente verificado en Resend, por ejemplo `Iris Dubs <contacto@tudominio.com>`.
- `CONTACT_TO_EMAIL`: correo donde deben llegar los mensajes.

El formulario no guarda mensajes en base de datos; solo envia el correo mediante Resend.
