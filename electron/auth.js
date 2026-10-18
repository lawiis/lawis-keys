'use strict';
/*
 * Login con Discord para app de escritorio (OAuth2 implicit grant).
 * No usa client secret: seguro para un .exe distribuido.
 * Abre el navegador -> Discord -> redirige a http://localhost:PORT/callback
 * -> capturamos el access_token del fragmento -> pedimos el perfil.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { shell, app, BrowserWindow } = require('electron');
const cfg = require('./config');

const SESSION_FILE = () => path.join(app.getPath('userData'), 'session.json');

function authUrl(silent) {
  const p = new URLSearchParams({
    client_id: cfg.DISCORD_CLIENT_ID,
    redirect_uri: cfg.OAUTH_REDIRECT,
    response_type: 'token',
    scope: cfg.OAUTH_SCOPE
  });
  if (silent) p.set('prompt', 'none');
  return 'https://discord.com/oauth2/authorize?' + p.toString();
}

function runFlow(silent) {
  return new Promise((resolve, reject) => {
    let server;
    let hiddenWin = null;
    let done = false;
    const cleanup = () => {
      try { if (server) server.close(); } catch (e) {}
      try { if (hiddenWin && !hiddenWin.isDestroyed()) hiddenWin.destroy(); } catch (e) {}
    };
    const finish = (fn, arg) => { if (done) return; done = true; clearTimeout(timer); cleanup(); fn(arg); };
    const timer = setTimeout(() => finish(reject, new Error('timeout')), silent ? 15000 : 120000);

    server = http.createServer((req, res) => {
      let u;
      try { u = new URL(req.url, cfg.OAUTH_REDIRECT); } catch (e) { res.writeHead(400); return res.end(); }
      if (u.pathname === '/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><meta charset="utf-8"><title>Lawis Keys</title>
<body style="background:#0c0a14;color:#ece9f6;font-family:Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center"><h2 style="color:#a78bfa">Lawis Keys</h2><p id="m">Procesando login&hellip;</p></div>
<script>fetch('/token?'+location.hash.slice(1)).then(function(){document.getElementById('m').textContent='Listo. Ya puedes volver a la app.';});</script>`);
      } else if (u.pathname === '/token') {
        res.writeHead(200); res.end('ok');
        const err = u.searchParams.get('error');
        const token = u.searchParams.get('access_token');
        if (err) return finish(reject, new Error(err));
        if (!token) return finish(reject, new Error('sin token'));
        const expiresIn = parseInt(u.searchParams.get('expires_in') || '604800', 10);
        finish(resolve, { access_token: token, expires_at: Date.now() + expiresIn * 1000 });
      } else { res.writeHead(404); res.end(); }
    });
    server.on('error', (e) => finish(reject, e));
    server.listen(cfg.OAUTH_PORT, '127.0.0.1', () => {
      const url = authUrl(silent);
      if (silent) {
        hiddenWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
        hiddenWin.loadURL(url).catch(() => {});
      } else {
        shell.openExternal(url);
      }
    });
  });
}

async function fetchUser(token) {
  const r = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!r.ok) throw new Error('perfil ' + r.status);
  const u = await r.json();
  const avatar = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${(parseInt(u.id.slice(-1)) || 0) % 5}.png`;
  return {
    id: u.id,
    username: u.username,
    display: u.global_name || u.username,
    avatar
  };
}

function saveSession(s) {
  try { fs.writeFileSync(SESSION_FILE(), JSON.stringify(s)); } catch (e) {}
}
function readSession() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE(), 'utf8')); } catch (e) { return null; }
}
function clearSession() {
  try { fs.unlinkSync(SESSION_FILE()); } catch (e) {}
}

// Log al webhook de Discord cuando alguien inicia sesion
async function sendLoginLog(user) {
  if (!cfg.LOGIN_WEBHOOK) return;
  try {
    await fetch(cfg.LOGIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Lawis Keys',
        embeds: [{
          title: 'Nuevo inicio de sesion',
          color: 0x8b5cf6,
          thumbnail: { url: user.avatar },
          fields: [
            { name: 'Usuario', value: `${user.display} (@${user.username})`, inline: true },
            { name: 'ID', value: user.id, inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) { /* no bloquea el login */ }
}

// Login interactivo (abre navegador)
async function login() {
  if (!cfg.LOGIN_ENABLED) throw new Error('login no configurado (falta DISCORD_CLIENT_ID)');
  const t = await runFlow(false);
  const user = await fetchUser(t.access_token);
  const session = { ...t, user };
  saveSession(session);
  sendLoginLog(user);
  return user;
}

// Devuelve la sesion valida guardada, o intenta refrescar en silencio, o null
async function getSession() {
  // sin client id no hay OAuth posible: no intentes el refresco silencioso
  // (abriria una ventana oculta contra una URL invalida y colgaria 15s el arranque)
  if (!cfg.LOGIN_ENABLED) return null;
  const s = readSession();
  if (!s) return null;
  // token aun valido
  if (s.access_token && s.expires_at && Date.now() < s.expires_at - 60000) {
    try { await fetchUser(s.access_token); return s.user; } catch (e) { /* invalido, sigue */ }
  }
  // intenta refresco silencioso (si sigue autorizado en Discord)
  try {
    const t = await runFlow(true);
    const user = await fetchUser(t.access_token);
    saveSession({ ...t, user });
    return user;
  } catch (e) {
    return null;
  }
}

function logout() { clearSession(); }

// El token se queda en el proceso principal y NO se expone al renderer:
// solo lo usa electron/rank.js para identificarse ante el servidor del ranking.
function getToken() {
  const s = readSession();
  if (!s || !s.access_token) return null;
  if (s.expires_at && Date.now() >= s.expires_at) return null;
  return s.access_token;
}

module.exports = { login, logout, getSession, getToken };
