'use strict';
const { app, BrowserWindow, ipcMain, shell, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const auth = require('./auth');
const presence = require('./presence');
const globalkeys = require('./globalkeys');
const rank = require('./rank');

// Una sola instancia (el puerto del login y el presence deben ser unicos)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// Carpeta de sonidos: en dev = ../assets/sounds, empaquetado = resources/sounds
const soundsDir = app.isPackaged
  ? path.join(process.resourcesPath, 'sounds')
  : path.join(__dirname, '..', 'assets', 'sounds');

let mainWindow = null;
let tray = null;

const ICON_PNG = path.join(__dirname, '..', 'build', 'icon.png');
const ICON_ICO = path.join(__dirname, '..', 'build', 'icon.ico');
// Icono de ventana: .ico multi-tamano si existe (mejor en la barra de tareas), si no el png
const WIN_ICON = fs.existsSync(ICON_ICO) ? ICON_ICO : ICON_PNG;

// Genera build/icon.ico multi-resolucion desde el png (evita el logo "partido" en la barra)
function makeIco() {
  const src = nativeImage.createFromPath(ICON_PNG);
  const sizes = [256, 128, 64, 48, 32, 24, 16];
  const imgs = sizes.map((s) => ({ size: s, png: src.resize({ width: s, height: s, quality: 'best' }).toPNG() }));
  const count = imgs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const datas = [];
  imgs.forEach((img, i) => {
    const e = i * 16;
    const dim = img.size >= 256 ? 0 : img.size;
    entries.writeUInt8(dim, e + 0);
    entries.writeUInt8(dim, e + 1);
    entries.writeUInt8(0, e + 2);
    entries.writeUInt8(0, e + 3);
    entries.writeUInt16LE(1, e + 4);
    entries.writeUInt16LE(32, e + 6);
    entries.writeUInt32LE(img.png.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += img.png.length;
    datas.push(img.png);
  });
  fs.writeFileSync(ICON_ICO, Buffer.concat([header, entries, ...datas]));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 600,
    minWidth: 940,
    minHeight: 520,
    frame: false,
    transparent: false,        // Windows 11 redondea la ventana de forma nativa (sin esquinas fantasma)
    backgroundColor: '#0c0a14',
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    icon: WIN_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,            // permite que el preload lea electron/config.js
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!app.isQuiting && closeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Modo captura/autotest (solo dev): TK_SHOT=ruta.png
  if (process.env.TK_SHOT) {
    const logs = [];
    mainWindow.webContents.on('console-message', (e, level, msg) => logs.push(`[${level}] ${msg}`));
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          // 1) foto de la pantalla de login (forzada, por si hay sesion guardada)
          const loginH1Color = await mainWindow.webContents.executeJavaScript(`(()=>{const l=document.getElementById('login');l.style.display='';l.classList.remove('gone');const h=document.querySelector('.login-card h1');return getComputedStyle(h).color;})()`);
          // la pantalla vuelve con una transicion de 400ms: si se captura antes
          // sale a medio opacar y no se puede juzgar el diseno
          await new Promise(r => setTimeout(r, 650));
          const loginShot = await mainWindow.webContents.capturePage();
          fs.writeFileSync(process.env.TK_SHOT.replace('.png', '_login.png'), loginShot.toPNG());
          fs.writeFileSync(process.env.TK_SHOT + '.login.json', JSON.stringify({ loginH1Color }));
          // 2) inicia sesion de prueba y prueba la app
          const report = await mainWindow.webContents.executeJavaScript(`(async () => {
            // entra como el admin para poder revisar tambien su panel
            window.__tkDevLogin({ id: window.tokkyo.config.adminId || '000000000000000001', username: 'tokkyo_test', display: 'Tokkyo Test', avatar: '' });
            await new Promise(r => setTimeout(r, 500));
            const sel = document.getElementById('pack-select');
            const opts = Array.from(sel.querySelectorAll('option'));
            const totalPacks = opts.length;
            const categories = Array.from(sel.querySelectorAll('optgroup')).map(g => g.label);
            // prueba una MUESTRA (1 de cada 6) para no saturar memoria
            const packResults = [];
            for (const opt of opts.filter((_, i) => i % 6 === 0)) {
              sel.value = opt.value;
              sel.dispatchEvent(new Event('change'));
              let tries = 0;
              while (document.getElementById('loading').classList.contains('hidden') === false && tries < 60) {
                await new Promise(r => setTimeout(r, 50)); tries++;
              }
              await new Promise(r => setTimeout(r, 30));
              packResults.push({ pack: opt.value, state: (window.__tkAudioState || 'n/a') });
            }
            // vuelve a un pack conocido y simula tecleo sobre el teclado 3D
            sel.value = 'cherrymx-blue-abs'; sel.dispatchEvent(new Event('change'));
            await new Promise(r => setTimeout(r, 200));
            for (const c of ['KeyT','KeyO','KeyK','KeyK','KeyY','KeyO','Space']) {
              window.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true }));
              await new Promise(r => setTimeout(r, 45));
              window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true }));
            }
            const artVisible = (() => {
              const a = document.getElementById('toolbar-art');
              return !!a && a.closest('.ctrl-art').style.display !== 'none' && a.naturalWidth > 0;
            })();
            const discordLogoOk = (() => {
              const l = document.querySelector('.discord-btn-logo');
              return !!l && l.naturalWidth > 0;
            })();
            // deja una tecla hundida para que se vea en la foto
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true }));
            await new Promise(r => setTimeout(r, 80));
            const keysDown = document.querySelectorAll('#kb3d div').length > 500;
            // clic de raton: usa su propio pack, que debe quedar cargado
            const ms = document.getElementById('mouse-select');
            const mouseOptions = ms.querySelectorAll('option').length;
            const mousePack = ms.value;
            window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            const mouseState = window.__tkMouseState || 'n/a';
            // abre el ranking y dejalo abierto para la foto
            document.getElementById('rank-btn').click();
            await new Promise(r => setTimeout(r, 900));
            const lbStatus = document.getElementById('lb-status').textContent;
            const podium = document.getElementById('lb-podium').children.length;
            const lbRows = document.getElementById('lb-list').children.length;
            document.getElementById('lb-close').click();
            // abre los ajustes y prueba los toggles
            document.getElementById('settings-btn').click();
            await new Promise(r => setTimeout(r, 250));
            const rpc = document.getElementById('rpc-toggle');
            const rpcBefore = rpc.getAttribute('aria-checked');
            rpc.click(); await new Promise(r => setTimeout(r, 60));
            const rpcAfter = rpc.getAttribute('aria-checked');
            rpc.click();  // dejalo como estaba
            document.getElementById('set-close').click();
            await new Promise(r => setTimeout(r, 250));
            // idiomas: cambia a ingles y frances y comprueba que la UI cambia
            const langBtn = document.getElementById('lang-btn');
            const langOf = (code) => {
              langBtn.click();
              document.querySelector('#lang-pop button[data-lang="' + code + '"]').click();
              return {
                short: document.getElementById('lang-short').textContent,
                count: document.querySelector('.stat label').textContent,
                setTitle: document.querySelector('.set-modal h3').textContent,
                cat0: document.querySelector('#pack-select optgroup').label
              };
            };
            const langs = { en: langOf('en'), fr: langOf('fr'), es: langOf('es') };
            await new Promise(r => setTimeout(r, 200));
            // color de la interfaz
            document.querySelector('#accent-swatches .swatch[data-color="#a9a9b0"]').click();
            const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
            document.querySelector('#accent-swatches .swatch[data-color="#ffffff"]').click();
            // panel de admin: debe existir y estar oculto para un usuario normal
            const adminHidden = document.getElementById('admin-btn').classList.contains('hidden');
            document.getElementById('admin-btn').click();
            await new Promise(r => setTimeout(r, 700));
            const admRows = document.getElementById('adm-list').children.length;
            const admStatus = document.getElementById('adm-status').textContent;
            document.getElementById('adm-close').click();
            return {
              totalPacks, categories, packResults, keysDown,
              mouseOptions, mousePack, mouseState,
              artVisible, discordLogoOk, langs, accent, adminHidden, admRows, admStatus,
              typedBarGone: !document.querySelector('.typed-bar'),
              discordLink: (window.tokkyo.config.links || {}).discord,
              lbStatus, podium, lbRows,
              rpcToggle: rpcBefore + '->' + rpcAfter,
              count: document.getElementById('key-count').textContent,
              userChipVisible: !document.getElementById('user-chip').classList.contains('hidden'),
              userName: document.getElementById('user-name').textContent,
              loginHidden: document.getElementById('login').classList.contains('gone')
            };
          })()`);
          fs.writeFileSync(process.env.TK_SHOT + '.json', JSON.stringify({ report, logs, globalHookReady: globalkeys.isReady() }, null, 2));
          const img = await mainWindow.webContents.capturePage();
          fs.writeFileSync(process.env.TK_SHOT, img.toPNG());

          // fotos de los dos paneles, para revisarlos sin abrir la app
          const shotPanel = async (openJs, suffix) => {
            await mainWindow.webContents.executeJavaScript(openJs);
            await new Promise(r => setTimeout(r, 900));
            const p = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.TK_SHOT.replace('.png', '_' + suffix + '.png'), p.toPNG());
          };
          await shotPanel("document.getElementById('admin-btn').click()", 'admin');
          await shotPanel("document.getElementById('adm-close').click();document.getElementById('rank-btn').click()", 'rank');
          await shotPanel("document.getElementById('lb-close').click();document.getElementById('settings-btn').click()", 'settings');
          // los ajustes en frances, para revisar que los acentos salen bien
          await shotPanel(
            "document.getElementById('lang-btn').click();" +
            "document.querySelector('#lang-pop button[data-lang=\"fr\"]').click();", 'settings_fr');
          await mainWindow.webContents.executeJavaScript(
            "document.getElementById('lang-btn').click();" +
            "document.querySelector('#lang-pop button[data-lang=\"es\"]').click();" +
            "document.getElementById('set-close').click()");
          // la app con un color de interfaz aplicado
          await shotPanel(
            "document.querySelector('#accent-swatches .swatch[data-color=\"#a9a9b0\"]').click();" +
            "document.getElementById('settings-btn').click()", 'accent');
          await mainWindow.webContents.executeJavaScript(
            "document.getElementById('set-close').click();" +
            "document.querySelector('#accent-swatches .swatch[data-color=\"#ffffff\"]').click()");
          // el desplegable de idiomas abierto
          await shotPanel("document.getElementById('lang-btn').click()", 'lang');
          await mainWindow.webContents.executeJavaScript("document.getElementById('lang-pop').classList.add('hidden')");
          // verifica minimizar -> bandeja (se oculta de la barra) y que el tray existe
          mainWindow.minimize();
          await new Promise(r => setTimeout(r, 400));
          const hiddenOnMinimize = !mainWindow.isVisible();
          mainWindow.show();
          fs.writeFileSync(process.env.TK_SHOT + '.tray.json', JSON.stringify({ hiddenOnMinimize, trayCreated: !!tray }));
        } catch (e) {
          fs.writeFileSync(process.env.TK_SHOT + '.json', JSON.stringify({ error: String(e), logs }, null, 2));
        }
        app.quit();
      }, 2500);
    });
  }

  // Abrir enlaces externos en el navegador, no en la app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

let closeToTray = true;

function createTray() {
  if (tray) return;
  try {
    tray = new Tray(WIN_ICON);
  } catch (e) { return; }
  tray.setToolTip('Lawis Keys');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Lawis Keys', click: showWindow },
    { type: 'separator' },
    { label: 'Quit Lawis Keys', click: () => { app.isQuiting = true; app.quit(); } }
  ]));
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

// ---- IPC: control de ventana ----
ipcMain.on('win:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('win:tray', () => mainWindow && mainWindow.hide());
ipcMain.on('win:setCloseToTray', (e, val) => { closeToTray = !!val; });
ipcMain.on('win:close', (e, toTray) => {
  if (toTray !== undefined ? toTray : closeToTray) {
    if (mainWindow) mainWindow.hide();
  } else {
    app.isQuiting = true;
    if (mainWindow) mainWindow.close();
    app.quit();
  }
});
ipcMain.handle('win:isFocused', () => (mainWindow ? mainWindow.isFocused() : false));

// ---- IPC: login Discord ----
ipcMain.handle('auth:session', () => auth.getSession());
ipcMain.handle('auth:login', async () => {
  const user = await auth.login();
  presence.start();
  return user;
});
ipcMain.handle('auth:logout', () => { auth.logout(); return true; });

// ---- IPC: rich presence + enlaces ----
ipcMain.on('presence:update', (e, state) => presence.update(state));
ipcMain.handle('presence:setEnabled', (e, on) => presence.setEnabled(on));

// Ranking: pasa por el proceso principal porque necesita el token de Discord,
// que no se expone al renderer.
ipcMain.handle('rank:top', () => rank.top());
ipcMain.handle('rank:me', (e, userId) => rank.me(userId));
ipcMain.handle('rank:sync', (e, user, score) => rank.sync(user, score));
ipcMain.handle('rank:admin', (e, action, params, user) => rank.admin(action, params, user));
ipcMain.on('open:external', (e, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
});

// ---- IPC: sonidos ----
ipcMain.handle('sounds:list', () => {
  const packs = [];
  let entries = [];
  try {
    entries = fs.readdirSync(soundsDir, { withFileTypes: true });
  } catch (e) {
    return packs;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const cfgPath = path.join(soundsDir, ent.name, 'config.json');
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      packs.push({ folder: ent.name, config: cfg });
    } catch (e) {
      /* ignora packs con config invalido */
    }
  }
  return packs;
});

// Lee un archivo de audio dentro de la carpeta de sonidos y devuelve sus bytes
ipcMain.handle('sounds:read', (evt, folder, file) => {
  // hay packs de la comunidad con entradas vacias en "defines": sin esto,
  // path.join devolveria la carpeta del pack y readFileSync lanzaria EISDIR
  if (typeof folder !== 'string' || typeof file !== 'string' || !folder || !file) return null;
  const abs = path.join(soundsDir, folder, file);
  // seguridad: no salir de soundsDir
  const rel = path.relative(soundsDir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('ruta invalida');
  }
  // el config puede referenciar algo ausente o una carpeta -> el motor lo ignora
  let st;
  try { st = fs.statSync(abs); } catch (e) { return null; }
  if (!st.isFile()) return null;
  return fs.readFileSync(abs); // Buffer -> Uint8Array en el renderer
});

app.whenReady().then(() => {
  // modo generador de icono: crea build/icon.ico y sale
  if (process.env.TK_MAKEICON) {
    try { makeIco(); } catch (e) { console.error('makeIco', e); }
    app.quit();
    return;
  }
  createWindow();
  createTray();       // icono en la bandeja (la "flechita")
  presence.start();   // "Using Tokkyo Keys" mientras la app este abierta
  globalkeys.start(() => mainWindow);  // oir teclas con la app minimizada
});

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

// El hook global vive en un proceso hijo: si no se para explicitamente puede
// dejar la app viva en segundo plano, y entonces el bloqueo de instancia unica
// impide volver a abrirla.
app.on('before-quit', () => {
  presence.stop();
  globalkeys.stop();
  try { if (tray) tray.destroy(); } catch (e) {}
});

app.on('window-all-closed', () => {
  presence.stop();
  globalkeys.stop();
  try { if (tray) tray.destroy(); } catch (e) {}
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
