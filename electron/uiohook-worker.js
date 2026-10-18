'use strict';
/*
 * Proceso hijo aislado para el hook global de teclado (uiohook-napi).
 * Corre en un utilityProcess: si uiohook llegara a fallar, SOLO muere este
 * proceso (el main lo reinicia), la app principal nunca se cae.
 * Envia { type:'down'|'up', keycode } al proceso padre por cada tecla.
 */
try {
  const { uIOhook } = require('uiohook-napi');
  const pressed = new Set();

  const send = (msg) => {
    try { process.parentPort.postMessage(msg); } catch (e) { /* ignore */ }
  };

  uIOhook.on('keydown', (e) => {
    if (pressed.has(e.keycode)) return;   // ignora auto-repeticion
    pressed.add(e.keycode);
    send({ type: 'down', keycode: e.keycode });
  });
  uIOhook.on('keyup', (e) => {
    pressed.delete(e.keycode);
    send({ type: 'up', keycode: e.keycode });
  });

  // Clics del raton: tienen su propio sonido y su propio volumen
  uIOhook.on('mousedown', (e) => send({ type: 'mousedown', button: e.button }));
  uIOhook.on('mouseup', (e) => send({ type: 'mouseup', button: e.button }));

  uIOhook.start();
  send({ type: 'ready' });   // avisa al padre que el hook cargo bien

  // cierre limpio si el padre lo pide
  process.parentPort.on('message', (m) => {
    if (m && m.data === 'stop') {
      try { uIOhook.stop(); } catch (e) {}
      process.exit(0);
    }
  });
} catch (e) {
  // sin hook global: el padre lo detecta por el exit y la app sigue funcionando enfocada
  process.exit(1);
}
