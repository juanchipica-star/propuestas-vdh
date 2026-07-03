// Funcion serverless de Vercel: envuelve la app Express (server/src/app.js). Todas las
// rutas /api/* se enrutan aca via vercel.json (rewrites), preservando el path original.
import app from '../server/src/app.js';

export default app;
