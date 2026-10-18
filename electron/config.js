'use strict';
/*
 * Configuracion central de Tokkyo Keys.
 *
 * Este archivo SI se publica en el repositorio, asi que no pongas secretos aqui.
 * Los valores propios (client id de Discord, webhook, claves de Supabase) van en
 * `electron/config.local.js`, que esta en .gitignore. Copia `config.example.js`
 * a `config.local.js` y rellenalo.
 *
 * Prioridad: variable de entorno  >  config.local.js  >  valor por defecto.
 */

const defaults = {
  // --- Discord ---
  DISCORD_CLIENT_ID: '1558442083667410954',
  OAUTH_PORT: 9713,
  OAUTH_REDIRECT: 'http://localhost:9713/callback',
  OAUTH_SCOPE: 'identify',

  // Rich Presence
  RPC_DETAILS: 'Using Lawis Keys',
  RPC_STATE: 'Lawis Keys',
  RPC_LARGE_IMAGE: 'pic',
  RPC_LARGE_TEXT: 'Lawis Keys',

  // Webhook donde llegan los logs de login (solo lado main, no se expone al renderer).
  // Vacio = no se envia nada.
  LOGIN_WEBHOOK: '',

  // --- Supabase (ranking global) --- vacio = la app funciona sin ranking
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Servidor del ranking (Edge Function). Con esto puesto, las puntuaciones se
  // validan en el servidor y nadie puede falsearlas; sin esto la app escribe
  // directa en la base de datos, que funciona pero es manipulable.
  // Ver server/README.md.
  RANK_FUNCTION_URL: '',
  RANK_SEASON: 's2-',

  // Quien ve el panel de administracion. Es solo para MOSTRARLO: los permisos
  // de verdad los comprueba el servidor con el token de Discord.
  ADMIN_DISCORD_ID: '',

  // Enlaces de los badges
  LINK_GITHUB: 'https://github.com/tokkyoleaks',
  LINK_DISCORD: 'https://discord.gg/47qGKsBKV3',
  LINK_WEB: '',
  LINK_INSTAGRAM: 'https://instagram.com/iztokkyo'
};

// config.local.js es opcional: sin el, la app arranca igual (sin login ni ranking)
let local = {};
try {
  local = require('./config.local');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND' || !/config\.local/.test(String(e.message))) throw e;
}

// Cualquier clave se puede sobreescribir con una variable de entorno TK_<CLAVE>
const fromEnv = {};
for (const key of Object.keys(defaults)) {
  const v = process.env['TK_' + key];
  if (v !== undefined && v !== '') fromEnv[key] = typeof defaults[key] === 'number' ? Number(v) : v;
}

const cfg = Object.assign({}, defaults, local, fromEnv);

// El redirect tiene que coincidir con el puerto, si no el login falla en silencio
if (!fromEnv.OAUTH_REDIRECT && !local.OAUTH_REDIRECT && cfg.OAUTH_PORT !== defaults.OAUTH_PORT) {
  cfg.OAUTH_REDIRECT = `http://localhost:${cfg.OAUTH_PORT}/callback`;
}

// Tokkyo pidio QUITAR el login de Discord: la app abre directa, sin iniciar
// sesion. Como ya no hay cuenta de Discord, el ranking global (que identifica a
// cada jugador por su cuenta) tampoco tiene sentido, asi que queda apagado.
// Para reactivarlos en el futuro, borra estas dos lineas y descomenta las de abajo.
cfg.LOGIN_ENABLED = false;
cfg.RANKING_ENABLED = false;
// cfg.LOGIN_ENABLED = !!cfg.DISCORD_CLIENT_ID;
// cfg.RANKING_ENABLED = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

module.exports = cfg;
