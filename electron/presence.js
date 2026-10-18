'use strict';
/*
 * Rich Presence de Discord para Lawis Keys.
 * Con reconexion automatica, manejo de rate limits y reintentos.
 */
const cfg = require('./config');

let client = null;
let ready = false;
let startTs = null;
let lastPack = cfg.RPC_STATE || 'Mechanical Keys';
let reconnectTimer = null;
let updateTimer = null;
let pendingApply = false;
let enabled = true;

function apply() {
  if (!enabled || !client || !ready) return;

  // Rate-limit debounce: Discord RPC permite max 1 actualizacion cada pocos segundos
  if (updateTimer) {
    pendingApply = true;
    return;
  }

  updateTimer = setTimeout(() => {
    updateTimer = null;
    if (pendingApply) {
      pendingApply = false;
      apply();
    }
  }, 3500);

  try {
    const activity = {
      details: cfg.RPC_DETAILS || 'Using Lawis Keys',
      state: lastPack,
      largeImageKey: cfg.RPC_LARGE_IMAGE || 'pic',
      largeImageText: cfg.RPC_LARGE_TEXT || 'Lawis Keys',
      startTimestamp: startTs,
      instance: false
    };

    const p = client.user.setActivity(activity);
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        // Solo marcar desconectado si la conexion realmente cayo
        const msg = String(err && err.message || '');
        if (msg.includes('ENDED') || msg.includes('closed') || (err && err.code === 'CONNECTION_ENDED')) {
          ready = false;
          scheduleReconnect();
        }
      });
    }
  } catch (e) {
    /* ignore */
  }
}

function scheduleReconnect() {
  if (!enabled || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    start();
  }, 8000);
}

async function start() {
  if (!enabled) return;
  if (client && ready) {
    apply();
    return;
  }

  stop();

  let Client;
  try {
    ({ Client } = require('@xhayper/discord-rpc'));
  } catch (e) {
    return;
  }

  if (!cfg.DISCORD_CLIENT_ID) return;

  startTs = startTs || Date.now();
  try {
    client = new Client({ clientId: cfg.DISCORD_CLIENT_ID });

    client.on('ready', () => {
      ready = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      apply();
    });

    client.on('disconnected', () => {
      ready = false;
      scheduleReconnect();
    });

    await client.login();
  } catch (e) {
    // Discord cerrado o error de conexion: reintentar periodicamente
    ready = false;
    scheduleReconnect();
  }
}

function update(data) {
  if (typeof data === 'string' && data) {
    lastPack = data;
  } else if (data && typeof data === 'object') {
    if (data.pack) lastPack = data.pack;
  }
  apply();
}

function stop() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  ready = false;
  try {
    if (client) client.destroy();
  } catch (e) {}
  client = null;
}

function setEnabled(on) {
  enabled = !!on;
  if (enabled) start();
  else stop();
  return enabled;
}

function isEnabled() {
  return enabled;
}

module.exports = { start, update, stop, setEnabled, isEnabled };
