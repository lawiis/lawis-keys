'use strict';
/*
 * Plantilla de configuracion. Copiala a `config.local.js` y rellena lo que uses.
 * Todo es opcional: sin nada de esto la app funciona igual, solo que sin login
 * de Discord y sin ranking global.
 *
 *   copy electron\config.example.js electron\config.local.js     (Windows)
 *   cp   electron/config.example.js electron/config.local.js     (Linux/macOS)
 */
module.exports = {
  // --- Discord (login + Rich Presence) ---
  // Crea una app en https://discord.com/developers/applications
  // y anade el redirect de abajo en OAuth2 -> Redirects.
  DISCORD_CLIENT_ID: '',
  OAUTH_PORT: 9713,
  OAUTH_REDIRECT: 'http://localhost:9713/callback',

  // Opcional: webhook de Discord que recibe un aviso en cada login.
  // Dejalo vacio para no enviar nada.
  LOGIN_WEBHOOK: '',

  // --- Supabase (ranking global) ---
  // Crea la tabla:
  //   create table leaderboard (
  //     discord_id text primary key,
  //     username   text,
  //     avatar     text,
  //     score      bigint default 0,
  //     updated_at timestamptz default now()
  //   );
  // y habilita RLS con policies de select/insert/update para el rol anon.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Enlaces de los badges de abajo a la derecha
  LINK_GITHUB: 'https://github.com/tu-usuario',
  LINK_DISCORD: 'https://discord.gg/tu-invite',
  LINK_INSTAGRAM: 'https://instagram.com/tu-usuario'
};
