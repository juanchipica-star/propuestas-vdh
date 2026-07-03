# Propuestas App

App interna para organizar propuestas comerciales por cliente, hacer seguimiento de su estado
(borrador / enviada / pendiente / aprobada / rechazada) y crear propuestas nuevas copiando
plantillas PPT desde Google Drive.

## Estructura

- `server/` — API en Node.js + Express, con SQLite (modulo nativo `node:sqlite`, sin dependencias
  de compilacion) como base de datos.
- `client/` — Interfaz en React (Vite).

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
- **Plantillas**: PPTs maestros (sincronizados desde Drive o agregados a mano via API).
- **Propuestas**: titulo, cliente, plantilla de origen (si aplica), link a Drive, estado, fechas
  de envio/respuesta, notas.
- **Historial de estados**: registro de cada cambio de estado de una propuesta.

## Notas

- La base de datos SQLite se guarda en `server/data/propuestas.db` (no se versiona en git).
- No hay login de usuarios en esta primera version; la app esta pensada para correr en la red
  interna de la empresa.
