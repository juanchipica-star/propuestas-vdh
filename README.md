# Propuestas App

App interna para organizar propuestas comerciales por cliente, hacer seguimiento de su estado
(borrador / enviada / pendiente / aprobada / rechazada) y crear propuestas nuevas a partir de
plantillas PPT reales de VDH, ya sea en Google Drive o guardadas localmente.

## Estructura

- `server/` — API en Node.js + Express, con SQLite (modulo nativo `node:sqlite`, sin dependencias
  de compilacion) como base de datos, y generacion de PPT (`jszip`, sin dependencias nativas).
- `client/` — Interfaz en React (Vite).

## Importar las plantillas reales de VDH

Las plantillas (Coaching, Executive Search, Talent Acquisition, Talent Search, Market Insights,
Assessment, Selfplacement, Future Quest, mas sus versiones en ingles) se importan una vez desde
`server/`:

```powershell
npm run import-vdh -- "C:\Users\DELL\Downloads\Propuestas VDH"
```

Copia los `.pptx` a `server/data/files/templates/`, registra cada uno como plantilla (con su tipo
de servicio e idioma), y carga la propuesta real ya enviada a Desol (Market Insights) como historial.

Al generar una propuesta nueva desde una plantilla:
- Si la plantilla tiene un cuadro de texto vacio en la portada (Coaching, Market Insights,
  Selfplacement), la app **completa el nombre del cliente automaticamente**.
- En el resto (Executive Search, Talent Acquisition, Talent Search, Future Quest, Assessment, el
  deck institucional), la portada no tiene ese cuadro — se sigue completando a mano en PowerPoint,
  como antes. La app lo indica claramente en la pagina de Plantillas.
- Para Executive Search / Talent Acquisition / Talent Search hay una **calculadora de honorarios**
  (salario, pagos por año, % bono, % fee) que calcula el fee y las cuotas (formula verificada
  contra los ejemplos reales de los PPT) para copiar a mano en la tabla del PPT. El calculo queda
  guardado en la propuesta como registro de lo cotizado.

## Requisitos

- Node.js 22 o superior (usa el modulo nativo `node:sqlite`).

## Como correr la app en local

En dos terminales distintas:

```powershell
# Terminal 1: backend (puerto 4000)
cd server
copy .env.example .env
npm install
npm run dev

# Terminal 2: frontend (puerto 5173)
cd client
npm install
npm run dev
```

Abrir `http://localhost:5173`. El frontend llama a `/api/...`, que Vite redirige automaticamente
al backend en `http://localhost:4000` (ver `client/vite.config.js`).

Sin configurar Google Drive, la app funciona igual para clientes, propuestas y estados; solo la
pagina de **Plantillas** y el boton "Crear propuesta desde plantilla" requieren la integracion.

## Configurar Google Drive (opcional pero recomendado)

1. Ir a [Google Cloud Console](https://console.cloud.google.com/), crear (o reusar) un proyecto.
2. En "APIs y servicios" > "Biblioteca", habilitar **Google Drive API**.
3. En "APIs y servicios" > "Credenciales", crear credenciales OAuth 2.0 de tipo **Aplicacion web**.
   - En "URIs de redireccionamiento autorizados" agregar: `http://localhost:4000/oauth2callback`
   - Copiar el `Client ID` y `Client secret`.
4. En "Pantalla de consentimiento OAuth", agregar la cuenta de Google de la empresa como usuario
   de prueba (si la app esta en modo "Testing").
5. En `server/.env`, completar:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:4000/oauth2callback
   ```
6. Ejecutar, dentro de `server/`:
   ```powershell
   npm run get-refresh-token
   ```
   Se abrira una URL para pegar en el navegador: iniciar sesion con la cuenta de Google que tiene
   acceso a las carpetas de Drive con las propuestas/plantillas, y autorizar. La terminal imprime
   un `GOOGLE_REFRESH_TOKEN`; copiarlo tambien a `server/.env`.
7. En Google Drive, entrar a la carpeta donde estan las plantillas PPT, copiar su ID desde la URL
   (la parte despues de `/folders/`) y ponerlo en `DRIVE_TEMPLATES_FOLDER_ID` en `server/.env`.
   Opcionalmente, definir tambien `DRIVE_PROPOSALS_FOLDER_ID` con la carpeta donde deben quedar
   las copias generadas para cada cliente.
8. Reiniciar `npm run dev` en `server/`. La pagina de Plantillas empezara a sincronizar los
   archivos de esa carpeta automaticamente.

## Modelo de datos

- **Clientes**: nombre, contacto, email, telefono, notas.
- **Plantillas**: PPTs maestros (locales o en Drive), con tipo de servicio, idioma y si tienen
  placeholder de nombre de cliente.
- **Propuestas**: titulo, cliente, plantilla de origen (si aplica), tipo de servicio, archivo
  generado (local o Drive), estado, fechas de envio/respuesta, datos de honorarios cotizados
  (cuando aplica), notas.
- **Historial de estados**: registro de cada cambio de estado de una propuesta.

## Notas

- La base de datos SQLite se guarda en `server/data/propuestas.db` (no se versiona en git).
- Los PPT (plantillas y propuestas generadas) se guardan en `server/data/files/` cuando Drive no
  esta configurado (no se versionan en git).
- No hay login de usuarios en esta primera version; la app esta pensada para correr en la red
  interna de la empresa.
