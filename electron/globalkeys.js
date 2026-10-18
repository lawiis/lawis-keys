'use strict';
/*
 * Gestiona el hook global de teclado en un PROCESO HIJO AISLADO (utilityProcess).
 * Permite oir las teclas con la app minimizada / sin foco, como Mechvibes.
 * Si el hijo se cae (bug de uiohook), la app principal sobrevive y se reinicia
 * el hijo con un limite de reintentos.
 * Solo reenvia al renderer cuando la ventana NO tiene foco (si tiene foco, lo
 * maneja el propio renderer, para evitar sonido doble).
 */
const path = require('path');
const { utilityProcess } = require('electron');

let child = null;
let getWinRef = null;
let stopped = false;
let ready = false;
let retries = 0;
const MAX_RETRIES = 5;

function spawn() {
  if (stopped) return;
  const workerPath = path.join(__dirname, 'uiohook-worker.js');
  try {
    child = utilityProcess.fork(workerPath, [], { serviceName: 'tokkyo-uiohook' });
  } catch (e) {
    child = null;
    return;
  }

  child.on('message', (msg) => {
    if (!msg) return;
    if (msg.type === 'ready') { ready = true; return; }
    if (!getWinRef) return;
    const win = getWinRef();
    if (!win || win.isDestroyed() || win.isFocused()) return; // enfocado -> lo hace el renderer
    win.webContents.send('global:key', msg);
  });

  child.on('exit', () => {
    child = null;
    if (stopped) return;
    if (retries++ < MAX_RETRIES) {
      setTimeout(spawn, 1500); // reintenta tras un fallo del hook
    }
  });
}

function start(getWin) {
  getWinRef = getWin;
  stopped = false;
  retries = 0;
  spawn();
  return true;
}

function stop() {
  stopped = true;
  try { if (child) child.postMessage('stop'); } catch (e) {}
  try { if (child) child.kill(); } catch (e) {}
  child = null;
}

function isReady() { return ready; }

module.exports = { start, stop, isReady };
