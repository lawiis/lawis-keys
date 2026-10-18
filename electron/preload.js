'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const cfg = require('./config');

contextBridge.exposeInMainWorld('tokkyo', {
  // Control de ventana
  minimize: () => ipcRenderer.send('win:minimize'),
  hideToTray: () => ipcRenderer.send('win:tray'),
  close: (toTray) => ipcRenderer.send('win:close', toTray),
  setCloseToTray: (on) => ipcRenderer.send('win:setCloseToTray', on),

  // Sonidos
  listPacks: () => ipcRenderer.invoke('sounds:list'),
  readSound: (folder, file) => ipcRenderer.invoke('sounds:read', folder, file),

  // Login Discord
  getSession: () => ipcRenderer.invoke('auth:session'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Rich presence + enlaces externos
  presence: (state) => ipcRenderer.send('presence:update', state),
  setPresenceEnabled: (on) => ipcRenderer.invoke('presence:setEnabled', on),
  openExternal: (url) => ipcRenderer.send('open:external', url),

  // Ranking (el token de Discord se queda en el proceso principal)
  rankTop: () => ipcRenderer.invoke('rank:top'),
  rankMe: (userId) => ipcRenderer.invoke('rank:me', userId),
  rankSync: (user, score) => ipcRenderer.invoke('rank:sync', user, score),
  rankAdmin: (action, params, user) => ipcRenderer.invoke('rank:admin', action, params, user),

  // Teclas globales (cuando la app esta minimizada/sin foco)
  onGlobalKey: (cb) => ipcRenderer.on('global:key', (e, data) => cb(data)),

  // solo verdadero en modo prueba (TK_SHOT); habilita el hook de test
  isTest: !!process.env.TK_SHOT,

  // Config publica para el renderer (la anon key es publica; el webhook NO se expone)
  config: {
    loginEnabled: cfg.LOGIN_ENABLED,
    rankingEnabled: cfg.RANKING_ENABLED || !!cfg.RANK_FUNCTION_URL,
    secureRanking: !!cfg.RANK_FUNCTION_URL,
    adminId: cfg.ADMIN_DISCORD_ID,
    supabaseUrl: cfg.SUPABASE_URL,
    supabaseKey: cfg.SUPABASE_ANON_KEY,
    links: {
      github: cfg.LINK_GITHUB,
      discord: cfg.LINK_DISCORD,
      web: cfg.LINK_WEB,
      instagram: cfg.LINK_INSTAGRAM
    }
  }
});
