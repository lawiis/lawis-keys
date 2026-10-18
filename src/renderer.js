'use strict';
(function () {
  const { KEYCODE_MAP } = window.TOKKYO_KEYMAP;
  const { group } = window.TOKKYO_CATEGORIES;
  const i18n = window.TOKKYO_I18N;
  const t = i18n.t;
  const audio = new window.TokkyoAudio();
  const SB = window.tokkyo.config;

  // keycode de Mechvibes/uiohook -> KeyboardEvent.code, para animar la tecla
  // correcta cuando el sonido viene del hook global (app sin foco)
  const CODE_BY_KEYCODE = {};
  Object.keys(KEYCODE_MAP).forEach((code) => { CODE_BY_KEYCODE[KEYCODE_MAP[code]] = code; });

  const $ = (id) => document.getElementById(id);
  const ls = window.localStorage;

  // ================= TECLADO 3D =================
  const kb = new window.Keyboard3D($('kb3d'), {
    theme: ls.getItem('tk_kbtheme') || 'Panda',
    lighting: ls.getItem('tk_light') || 'react',
    sway: ls.getItem('tk_sway_on') === '1', // Desactivado por defecto para 0% uso de GPU/CPU en reposo
    interactive: false,   // solo se mueve con su animacion; no se gira ni se acerca
    onDown: (code, fromMouse) => { if (loggedIn) { audio.resume(); coreDown(KEYCODE_MAP[code], code, fromMouse); } },
    onUp: (code) => coreUp(KEYCODE_MAP[code], code)
  });

  // ================= CONTADOR Y RANKING =================
  let count = 0;
  const countEl = $('key-count');
  let rankScore = 0, lastRankCode = null, rankDirty = false;
  let banned = false;   // cuenta sancionada por moderacion: no puntua
  // Temporada 2: el ranking se reinicio, asi que la clave cambia para no
  // recuperar los puntos viejos guardados en este equipo.
  const RANK_KEY = (id) => 'tk_rank_s2_' + id;

  // Pulso de fondo desactivado para evitar layout thrashing en cada pulsacion
  function bgPulse() {}

  function coreDown(keycode, code) {
    if (keycode === undefined) return;
    audio.down(keycode);
    bgPulse();
    if (typeof snowBreeze === 'function') snowBreeze();
    count++;
    countEl.textContent = count.toLocaleString('es');
    const id = code || ('kc' + keycode);
    if (loggedIn && !banned && id !== lastRankCode) { lastRankCode = id; rankScore++; rankDirty = true; }
  }
  function coreUp(keycode) {
    if (keycode === undefined) return;
    audio.up(keycode);
  }

  // ================= TECLADO FISICO =================
  window.addEventListener('keydown', (e) => {
    if (e.code === 'CapsLock') kb.setCapsLed(e.getModifierState && e.getModifierState('CapsLock'));
    if (!loggedIn) return;
    audio.resume();
    if (e.repeat) return;
    if (KEYCODE_MAP[e.code] === undefined) return;
    // En un campo de texto (el buscador de packs) la tecla tiene que escribir:
    // suena y se anima igual, pero no se le quita su efecto.
    const typing = e.target && e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'search');
    if (!typing && !e.ctrlKey && !e.metaKey && e.code !== 'F5' && e.code !== 'F11' && e.code !== 'F12') e.preventDefault();
    if (kb.has(e.code)) kb.press(e.code);              // el propio teclado 3D dispara el sonido
    else coreDown(KEYCODE_MAP[e.code], e.code);        // teclas que el F75 no tiene (numpad, etc.)
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (KEYCODE_MAP[e.code] === undefined) return;
    if (kb.has(e.code)) kb.release(e.code);
    else coreUp(KEYCODE_MAP[e.code], e.code);
  });

  window.addEventListener('blur', () => kb.releaseAll());

  // Clic de raton dentro de la app (los de fuera llegan por el hook global).
  // Las teclas del 3D paran la propagacion, asi que pulsarlas no suena doble.
  window.addEventListener('mousedown', (e) => { if (loggedIn) { audio.resume(); audio.mouseClick(true, e.button); } });
  window.addEventListener('mouseup', (e) => { if (loggedIn) audio.mouseClick(false, e.button); });

  // ================= EVENTOS GLOBALES (app sin foco) =================
  window.tokkyo.onGlobalKey((data) => {
    if (!loggedIn) return;
    audio.resume();
    if (data.type === 'mousedown') return audio.mouseClick(true, data.button);
    if (data.type === 'mouseup') return audio.mouseClick(false, data.button);
    const code = CODE_BY_KEYCODE[data.keycode];
    if (data.type === 'down') {
      if (code && kb.has(code)) kb.press(code);
      else coreDown(data.keycode, code || null);
    } else {
      if (code && kb.has(code)) kb.release(code);
      else coreUp(data.keycode, code || null);
    }
  });

  // ================= VENTANA =================
  $('btn-min').addEventListener('click', () => window.tokkyo.minimize());
  const btnTray = $('btn-tray');
  if (btnTray) btnTray.addEventListener('click', () => window.tokkyo.hideToTray());
  $('btn-close').addEventListener('click', () => {
    const toTray = ls.getItem('tk_close_to_tray') !== '0';
    window.tokkyo.close(toTray);
  });

  // ================= VOLUMENES =================
  const vol = $('volume'), volVal = $('vol-val');
  const mvol = $('mouse-volume'), mvolVal = $('mvol-val');

  function applyVolume(v) {
    audio.setVolume(v / 100);
    volVal.textContent = v + '%';
    vol.value = v;
    vol.style.setProperty('--fill', v + '%');
    ls.setItem('tk_volume', v);
  }
  function applyMouseVolume(v) {
    audio.setMouseVolume(v / 100);
    mvolVal.textContent = v + '%';
    mvol.value = v;
    mvol.style.setProperty('--fill', v + '%');
    ls.setItem('tk_mvolume', v);
  }
  vol.addEventListener('input', () => applyVolume(parseInt(vol.value, 10)));
  mvol.addEventListener('input', () => applyMouseVolume(parseInt(mvol.value, 10)));

  // ================= PACKS =================
  // ================= SELECTORES DE SONIDO =================
  const packSelect = $('pack-select');
  const mouseSelect = $('mouse-select');
  const packFavBtn = $('pack-fav-btn');
  const mouseFavBtn = $('mouse-fav-btn');

  function getJsonList(key) {
    try {
      const v = JSON.parse(ls.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function setJsonList(key, list) {
    ls.setItem(key, JSON.stringify(list));
  }

  function isFavorite(type, folder) {
    if (!folder) return false;
    const key = type === 'mouse' ? 'tk_fav_mouse' : 'tk_fav_packs';
    return getJsonList(key).includes(folder);
  }

  function toggleFavorite(type, folder) {
    if (!folder) return;
    const key = type === 'mouse' ? 'tk_fav_mouse' : 'tk_fav_packs';
    let list = getJsonList(key);
    const idx = list.indexOf(folder);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(folder);
    setJsonList(key, list);
    buildPackOptions();
    updateFavButtons();
  }

  function addRecent(type, folder) {
    if (!folder) return;
    const key = type === 'mouse' ? 'tk_recent_mouse' : 'tk_recent_packs';
    let list = getJsonList(key).filter((f) => f !== folder);
    list.unshift(folder);
    if (list.length > 5) list = list.slice(0, 5);
    setJsonList(key, list);
    buildPackOptions();
  }

  function updateFavButtons() {
    if (packFavBtn) {
      const on = isFavorite('key', packSelect.value);
      packFavBtn.classList.toggle('on', on);
      packFavBtn.title = on ? t('tip.unfav') : t('tip.fav');
    }
    if (mouseFavBtn) {
      const on = isFavorite('mouse', mouseSelect.value);
      mouseFavBtn.classList.toggle('on', on);
      mouseFavBtn.title = on ? t('tip.unfav') : t('tip.fav');
    }
  }

  if (packFavBtn) packFavBtn.addEventListener('click', () => toggleFavorite('key', packSelect.value));
  if (mouseFavBtn) mouseFavBtn.addEventListener('click', () => toggleFavorite('mouse', mouseSelect.value));

  // Los dos selectores se dibujan con el selector propio de la app (buscador y
  // categorias) en vez de con la lista nativa del sistema.
  window.TokkyoSelect.enhance(packSelect, {
    t,
    icon: 'wave',
    isFav: (val) => isFavorite('key', val),
    onToggleFav: (val) => toggleFavorite('key', val)
  });
  window.TokkyoSelect.enhance(mouseSelect, {
    t,
    icon: 'mouse',
    isFav: (val) => isFavorite('mouse', val),
    onToggleFav: (val) => toggleFavorite('mouse', val)
  });

  const loading = $('loading');
  let packsByFolder = {};
  let allPacks = [];

  async function selectPack(folder) {
    const meta = packsByFolder[folder];
    if (!meta) return;
    loading.classList.remove('hidden');
    try { await audio.loadPack(meta); } catch (e) { console.error('pack', folder, e); }
    loading.classList.add('hidden');
    window.__tkAudioState = audio.current ? (audio.current.type + ':loaded') : 'not-loaded';
    ls.setItem('tk_pack', folder);
    addRecent('key', folder);
    updateFavButtons();
    window.tokkyo.presence(meta.config.name || folder);
  }
  packSelect.addEventListener('change', () => selectPack(packSelect.value));

  async function selectMousePack(folder) {
    if (folder === '__synth__') {
      await audio.loadMousePack(null);
      ls.setItem('tk_mousepack', folder);
      addRecent('mouse', folder);
      updateFavButtons();
      return;
    }
    const meta = packsByFolder[folder];
    if (!meta) return;
    try { await audio.loadMousePack(meta); } catch (e) { console.error('mouse pack', folder, e); }
    window.__tkMouseState = audio.mousePack ? (audio.mousePack.type + ':loaded') : 'not-loaded';
    ls.setItem('tk_mousepack', folder);
    addRecent('mouse', folder);
    updateFavButtons();
  }
  mouseSelect.addEventListener('change', () => selectMousePack(mouseSelect.value));

  // Rellena un <select> con favoritos, recientes y packs agrupados por categoria
  function fillPackSelect(sel, packs, type) {
    const isMouse = type === 'mouse';
    const favKey = isMouse ? 'tk_fav_mouse' : 'tk_fav_packs';
    const recentKey = isMouse ? 'tk_recent_mouse' : 'tk_recent_packs';
    const favs = getJsonList(favKey);
    const recents = getJsonList(recentKey);

    // 1. Grupo de Favoritos
    if (favs.length) {
      const ogFav = document.createElement('optgroup');
      ogFav.label = '★ ' + t('cat.favorites');
      favs.forEach((folder) => {
        if (isMouse && folder === '__synth__') {
          const opt = document.createElement('option');
          opt.value = '__synth__';
          opt.textContent = t('mouse.synth');
          ogFav.appendChild(opt);
          return;
        }
        const p = packsByFolder[folder];
        if (p) {
          const opt = document.createElement('option');
          opt.value = p.folder;
          opt.textContent = p.config.name || p.folder;
          ogFav.appendChild(opt);
        }
      });
      if (ogFav.children.length) sel.appendChild(ogFav);
    }

    // 2. Grupo de Usados recientemente (omitiendo los que ya estan en favoritos)
    const recentsFiltered = recents.filter((f) => !favs.includes(f));
    if (recentsFiltered.length) {
      const ogRecent = document.createElement('optgroup');
      ogRecent.label = '🕒 ' + t('cat.recent');
      recentsFiltered.forEach((folder) => {
        if (isMouse && folder === '__synth__') {
          const opt = document.createElement('option');
          opt.value = '__synth__';
          opt.textContent = t('mouse.synth');
          ogRecent.appendChild(opt);
          return;
        }
        const p = packsByFolder[folder];
        if (p) {
          const opt = document.createElement('option');
          opt.value = p.folder;
          opt.textContent = p.config.name || p.folder;
          ogRecent.appendChild(opt);
        }
      });
      if (ogRecent.children.length) sel.appendChild(ogRecent);
    }

    // 3. Opcion sintetico para el raton
    if (isMouse) {
      const synth = document.createElement('option');
      synth.value = '__synth__';
      synth.textContent = t('mouse.synth');
      sel.appendChild(synth);
    }

    // 4. Categorias generales
    group(packs).forEach((cat) => {
      const og = document.createElement('optgroup');
      og.label = t('cat.' + cat.id);
      cat.packs.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.folder;
        opt.textContent = p.config.name || p.folder;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
  }

  // Rehace las dos listas conservando lo que estuviera elegido. Se llama tambien
  // al cambiar de idioma, porque los nombres de las categorias van traducidos.
  function buildPackOptions() {
    if (!allPacks.length) return;
    const keep = packSelect.value;
    const keepMouse = mouseSelect.value;

    packSelect.innerHTML = '';
    fillPackSelect(packSelect, allPacks, 'key');

    mouseSelect.innerHTML = '';
    fillPackSelect(mouseSelect, allPacks, 'mouse');

    if (keep) packSelect.value = keep;
    if (keepMouse) mouseSelect.value = keepMouse;
    updateFavButtons();
  }

  async function initPacks() {
    applyVolume(parseInt(ls.getItem('tk_volume') || '70', 10));
    applyMouseVolume(parseInt(ls.getItem('tk_mvolume') || '50', 10));

    const packs = await window.tokkyo.listPacks();
    allPacks = packs;
    packSelect.innerHTML = '';
    mouseSelect.innerHTML = '';
    packsByFolder = {};
    if (!packs.length) {
      const o = document.createElement('option');
      o.textContent = t('packs.none');
      packSelect.appendChild(o);
      return;
    }
    packs.forEach((p) => { packsByFolder[p.folder] = p; });
    buildPackOptions();

    const DEFAULT_PACK = 'cherrymx-blue-abs';
    let def = ls.getItem('tk_pack');
    if (!def || !packsByFolder[def]) def = packsByFolder[DEFAULT_PACK] ? DEFAULT_PACK : packs[0].folder;
    packSelect.value = def;
    await selectPack(def);

    let mdef = ls.getItem('tk_mousepack');
    if (!mdef || (mdef !== '__synth__' && !packsByFolder[mdef])) {
      mdef = packsByFolder[DEFAULT_PACK] ? DEFAULT_PACK : '__synth__';
    }
    mouseSelect.value = mdef;
    await selectMousePack(mdef);
  }

  // ================= LOGIN =================
  let loggedIn = false, currentUser = null;
  const loginScreen = $('login');
  const loginBtn = $('login-btn');
  const loginBtnText = $('login-btn-text');
  const loginErr = $('login-err');
  const userChip = $('user-chip');
  const userAvatar = $('user-avatar');
  const userName = $('user-name');

  function showApp(user) {
    currentUser = user;
    loggedIn = true;
    userName.textContent = user.display;
    if (user.avatar) { userAvatar.src = user.avatar; userAvatar.style.display = ''; }
    else { userAvatar.removeAttribute('src'); userAvatar.style.display = 'none'; }
    $('logout-btn').style.display = SB.loginEnabled ? '' : 'none';
    // Sin login no mostramos la ficha de usuario (no hay cuenta que enseñar).
    userChip.classList.toggle('hidden', !SB.loginEnabled);
    loginScreen.classList.add('gone');
    // Con login: se desvanece. Sin login: se oculta al instante, sin parpadeo.
    if (SB.loginEnabled) setTimeout(() => { loginScreen.style.display = 'none'; }, 420);
    else loginScreen.style.display = 'none';
    initRank(user);
  }

  async function doLogin() {
    loginErr.textContent = '';
    loginBtn.disabled = true;
    loginBtnText.removeAttribute('data-i18n');   // texto temporal, que no lo pise el idioma
    loginBtnText.textContent = t('login.opening');
    try {
      showApp(await window.tokkyo.login());
    } catch (e) {
      loginErr.textContent = t('login.error');
    } finally {
      loginBtn.disabled = false;
      loginBtnText.dataset.i18n = 'login.btn';
      loginBtnText.textContent = t('login.btn');
    }
  }
  loginBtn.addEventListener('click', doLogin);
  if (window.tokkyo.isTest) window.__tkDevLogin = (u) => showApp(u);

  $('logout-btn').addEventListener('click', async () => {
    if (currentUser) {
      ls.setItem(RANK_KEY(currentUser.id), String(rankScore));
      if (rankDirty) { rankDirty = false; await pushScore(); }
    }
    if (rankTimer) { clearInterval(rankTimer); rankTimer = null; }
    await window.tokkyo.logout();
    loggedIn = false; currentUser = null;
    rankScore = 0; lastRankCode = null;
    userChip.classList.add('hidden');
    setupAdmin(false);
    closeOverlay(lbOverlay);
    closeOverlay($('adm-overlay'));
    loginScreen.style.display = '';
    requestAnimationFrame(() => loginScreen.classList.remove('gone'));
  });

  // ================= RANKING (Supabase) =================
  const lbOverlay = $('lb-overlay');
  const lbList = $('lb-list');
  const lbPodium = $('lb-podium');
  const lbMe = $('lb-me');
  const lbStatus = $('lb-status');

  /*
   * El ranking no se toca desde aqui: todo pasa por el proceso principal, que
   * es quien tiene el token de Discord. Con el servidor desplegado, ademas, es
   * el servidor quien decide la puntuacion final (frena las subidas imposibles
   * y aplica las sanciones), asi que esta pantalla solo pinta lo que le digan.
   */
  function rankEnabled() { return !!SB.rankingEnabled; }

  let myRankPos = null;

  async function pushScore() {
    if (!rankEnabled() || !currentUser || window.tokkyo.isTest || banned) return;
    const res = await window.tokkyo.rankSync(currentUser, rankScore);
    if (res && res.banned) { banned = true; rankScore = 0; lastRankCode = null; }
    // el servidor puede recortar: se adopta su numero como bueno
    else if (res && typeof res.score === 'number') rankScore = res.score;
    if (currentUser) ls.setItem(RANK_KEY(currentUser.id), String(rankScore));
  }

  let rankTimer = null;
  async function initRank(user) {
    const local = parseInt(ls.getItem(RANK_KEY(user.id)) || '0', 10);
    let info = { score: 0, banned: false, admin: false };
    if (rankEnabled()) info = await window.tokkyo.rankMe(user.id);

    banned = !!info.banned;
    rankScore = banned ? 0 : Math.max(local, info.score || 0);
    myRankPos = info.rank || null;
    ls.setItem(RANK_KEY(user.id), String(rankScore));
    setupAdmin(!!info.admin);

    if (rankTimer) clearInterval(rankTimer);
    rankTimer = setInterval(async () => {
      if (!rankEnabled()) return;
      const srv = await window.tokkyo.rankMe(user.id);
      if (srv.banned) {                    // sancionado sobre la marcha
        banned = true;
        rankScore = 0;
        lastRankCode = null;
        ls.setItem(RANK_KEY(user.id), '0');
        return;
      }
      banned = false;
      myRankPos = srv.rank || null;
      if ((srv.score || 0) > rankScore) rankScore = srv.score;   // nunca baja
      ls.setItem(RANK_KEY(user.id), String(rankScore));
      if (rankDirty) { rankDirty = false; await pushScore(); }
    }, 8000);
  }

  window.addEventListener('beforeunload', () => {
    if (currentUser) ls.setItem(RANK_KEY(currentUser.id), String(rankScore));
  });

  const nf = (n) => Number(n || 0).toLocaleString('es');

  function avatarEl(url, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = '';
    if (url) img.src = url;
    img.addEventListener('error', () => img.removeAttribute('src'));
    return img;
  }

  function rowEl(pos, row, isMe) {
    const li = document.createElement('li');
    li.className = 'lb-item' + (isMe ? ' me' : '');
    const r = document.createElement('span');
    r.className = 'lb-rank';
    r.textContent = pos;
    const n = document.createElement('span');
    n.className = 'lb-name';
    n.textContent = row.username || '?';
    const s = document.createElement('span');
    s.className = 'lb-score';
    s.textContent = nf(row.score);
    li.append(r, avatarEl(row.avatar, 'lb-avatar'), n, s);
    return li;
  }

  function podEl(pos, row, isMe) {
    const d = document.createElement('div');
    d.className = 'pod' + (pos === 1 ? ' first' : '') + (isMe ? ' mine' : '');
    const m = document.createElement('span');
    m.className = 'pod-medal';
    m.textContent = '#' + pos;
    const n = document.createElement('span');
    n.className = 'pod-name';
    n.textContent = row.username || '?';
    const s = document.createElement('span');
    s.className = 'pod-score';
    s.textContent = nf(row.score);
    d.append(m, avatarEl(row.avatar, 'pod-av'), n, s);
    return d;
  }

  function renderLeaderboard(rows) {
    const meId = currentUser && currentUser.id;
    lbPodium.innerHTML = '';
    lbList.innerHTML = '';

    // podio: 2 - 1 - 3, con el primero mas alto
    const top = rows.slice(0, 3);
    const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
    order.forEach((i) => {
      if (!top[i]) return;
      lbPodium.appendChild(podEl(i + 1, top[i], top[i].discord_id === meId));
    });

    rows.slice(3).forEach((row, i) => {
      lbList.appendChild(rowEl(i + 4, row, row.discord_id === meId));
    });

    return rows.some((r) => r.discord_id === meId);
  }

  async function openLeaderboard() {
    openOverlay(lbOverlay);
    lbMe.classList.add('hidden');
    if (!rankEnabled()) {
      lbPodium.innerHTML = ''; lbList.innerHTML = '';
      lbStatus.textContent = t('lb.notset');
      return;
    }
    lbStatus.textContent = t('lb.loading');
    await pushScore();
    try {
      const rows = (await window.tokkyo.rankTop()).rows || [];
      const inTop = renderLeaderboard(rows);
      // el aviso de tabla vacia solo si tampoco sale tu fila, si no se contradicen
      const showMine = !inTop && currentUser && rankScore > 0;
      lbStatus.textContent = (rows.length || showMine) ? '' : t('lb.empty');

      // si no sales en el top 50, tu fila se queda fija abajo (con 0 no cuentas)
      if (showMine) {
        const pos = myRankPos;
        lbMe.innerHTML = '';
        const ol = document.createElement('ol');
        ol.className = 'lb-list';
        ol.style.padding = '0';
        ol.appendChild(rowEl(pos == null ? '—' : pos, { username: currentUser.display, avatar: currentUser.avatar, score: rankScore }, true));
        lbMe.appendChild(ol);
        lbMe.classList.remove('hidden');
      }
    } catch (e) {
      lbStatus.textContent = t('lb.error');
    }
  }

  // ================= OVERLAYS =================
  function openOverlay(o) { o.classList.remove('hidden'); }
  function closeOverlay(o) { o.classList.add('hidden'); }

  const setOverlay = $('set-overlay');
  $('rank-btn').addEventListener('click', openLeaderboard);
  $('lb-close').addEventListener('click', () => closeOverlay(lbOverlay));
  $('settings-btn').addEventListener('click', () => openOverlay(setOverlay));
  $('set-close').addEventListener('click', () => closeOverlay(setOverlay));

  [lbOverlay, setOverlay].forEach((o) => {
    o.addEventListener('mousedown', (e) => { if (e.target === o) closeOverlay(o); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeOverlay(lbOverlay);
    closeOverlay(setOverlay);
    closeOverlay($('adm-overlay'));
    const pop = $('lang-pop');
    if (pop) pop.classList.add('hidden');
  });

  // ================= BADGES =================
  document.querySelectorAll('.badge').forEach((b) => {
    b.addEventListener('click', () => {
      const url = SB.links[b.dataset.link];
      if (url) window.tokkyo.openExternal(url);
    });
  });

  // ================= AJUSTES =================
  function bindSwitch(id, key, def, onChange) {
    const el = $(id);
    const saved = ls.getItem(key);
    let on = saved === null ? def : saved === '1';
    const paint = () => el.setAttribute('aria-checked', on ? 'true' : 'false');
    paint();
    onChange(on, true);
    el.addEventListener('click', () => {
      on = !on;
      ls.setItem(key, on ? '1' : '0');
      paint();
      onChange(on, false);
    });
  }

  function bindSeg(id, attr, key, def, onChange) {
    const wrap = $(id);
    let val = ls.getItem(key) || def;
    const paint = () => wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
    paint();
    onChange(val, true);
    wrap.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        val = b.dataset[attr];
        ls.setItem(key, val);
        paint();
        onChange(val, false);
      });
    });
  }

  // ================= PESTAÑAS DE AJUSTES =================
  const tabBtnGen = $('tab-btn-gen');
  const tabBtnTheme = $('tab-btn-theme');
  const panelGen = $('panel-general');
  const panelTheme = $('panel-theme');

  function switchTab(tab) {
    const isGen = tab === 'gen';
    if (tabBtnGen) tabBtnGen.classList.toggle('on', isGen);
    if (tabBtnTheme) tabBtnTheme.classList.toggle('on', !isGen);
    if (panelGen) panelGen.classList.toggle('hidden', !isGen);
    if (panelTheme) panelTheme.classList.toggle('hidden', isGen);
  }

  if (tabBtnGen) tabBtnGen.addEventListener('click', () => switchTab('gen'));
  if (tabBtnTheme) tabBtnTheme.addEventListener('click', () => switchTab('theme'));

  // ================= TEMA DE LA APLICACIÓN =================
  function applyAppTheme(theme) {
    document.body.classList.remove('theme-glass', 'theme-cyber');
    if (theme === 'glass') {
      document.body.classList.add('theme-glass');
    } else if (theme === 'cyber') {
      document.body.classList.add('theme-cyber');
    }
    ls.setItem('tk_app_theme', theme);
  }

  // ================= EFECTO COPOS DE NIEVE =================
  const snowCanvas = $('snow-canvas');
  let snowCtx = null;
  let snowWidth = 0, snowHeight = 0;
  let snowFlakes = [];
  let snowAnimId = null;
  let snowActive = false;
  let snowWind = 0;

  function initSnow() {
    if (!snowCanvas) return;
    snowCtx = snowCanvas.getContext('2d');
    function resize() {
      snowWidth = snowCanvas.width = window.innerWidth;
      snowHeight = snowCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Pool de 38 copos prealocados (sin recolección de basura ni lag)
    const COUNT = 38;
    snowFlakes = [];
    for (let i = 0; i < COUNT; i++) {
      snowFlakes.push({
        x: Math.random() * (snowWidth || 800),
        y: Math.random() * (snowHeight || 600),
        r: 1.2 + Math.random() * 2.2,
        vy: 0.6 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 0.4,
        alpha: 0.25 + Math.random() * 0.55,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: 0.015 + Math.random() * 0.02
      });
    }
  }

  function snowBreeze() {
    if (!snowActive) return;
    snowWind += (Math.random() - 0.5) * 1.4;
    if (snowWind > 2.8) snowWind = 2.8;
    if (snowWind < -2.8) snowWind = -2.8;
  }

  function snowLoop() {
    if (!snowActive || !snowCtx) return;
    snowCtx.clearRect(0, 0, snowWidth, snowHeight);

    // Amortiguar viento suavemente hacia 0
    snowWind *= 0.94;

    for (let i = 0; i < snowFlakes.length; i++) {
      const f = snowFlakes[i];
      f.swing += f.swingSpeed;
      f.y += f.vy;
      f.x += f.vx + Math.sin(f.swing) * 0.4 + snowWind;

      // Reaparecer arriba al salir por el fondo o bordes laterales
      if (f.y > snowHeight + 8) {
        f.y = -6;
        f.x = Math.random() * snowWidth;
      }
      if (f.x > snowWidth + 8) f.x = -6;
      else if (f.x < -8) f.x = snowWidth + 6;

      snowCtx.beginPath();
      snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      snowCtx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
      snowCtx.fill();
    }

    snowAnimId = requestAnimationFrame(snowLoop);
  }

  function setSnowEnabled(on) {
    snowActive = !!on;
    if (snowAnimId) {
      cancelAnimationFrame(snowAnimId);
      snowAnimId = null;
    }
    if (snowActive) {
      if (!snowCtx) initSnow();
      snowAnimId = requestAnimationFrame(snowLoop);
    } else if (snowCtx) {
      snowCtx.clearRect(0, 0, snowWidth, snowHeight);
    }
  }

  // Pausar animación cuando la ventana está oculta (0% consumo en reposo)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (snowAnimId) { cancelAnimationFrame(snowAnimId); snowAnimId = null; }
    } else if (snowActive && !snowAnimId) {
      snowAnimId = requestAnimationFrame(snowLoop);
    }
  });

  bindSwitch('rpc-toggle', 'tk_rpc', true, (on, first) => {
    // en el primer arranque solo se avisa al main si esta apagado
    if (!first || !on) window.tokkyo.setPresenceEnabled(on);
  });
  bindSwitch('tray-toggle', 'tk_close_to_tray', true, (on) => {
    window.tokkyo.setCloseToTray(on);
  });
  bindSwitch('mouse-toggle', 'tk_mouse', true, (on) => audio.setMouseEnabled(on));
  bindSwitch('release-toggle', 'tk_release', false, (on) => audio.setReleaseEnabled(on));
  bindSwitch('sway-toggle', 'tk_sway_on', false, (on) => kb.setSway(on));
  bindSeg('theme-seg', 'theme', 'tk_kbtheme', 'Panda', (v, first) => { if (!first) kb.setTheme(v); });
  bindSeg('light-seg', 'light', 'tk_light', 'react', (v, first) => { if (!first) kb.setLighting(v); });

  bindSeg('app-theme-seg', 'apptheme', 'tk_app_theme', 'dark', (theme) => applyAppTheme(theme));
  bindSwitch('snow-toggle', 'tk_snow', true, (on) => setSnowEnabled(on));

  // ================= PANEL DE ADMIN =================
  /*
   * Este panel solo se MUESTRA a quien tenga el id de admin. Eso es cosmético:
   * quien edite la app puede hacerlo aparecer. Lo que de verdad protege es el
   * servidor, que comprueba el token de Discord en cada acción y rechaza al que
   * no sea administrador. Ver server/README.md.
   */
  const admOverlay = $('adm-overlay');
  const admList = $('adm-list');
  const admQuery = $('adm-query');
  const admStatus = $('adm-status');
  const admMode = $('adm-mode');
  let isAdmin = false;

  function setupAdmin(on) {
    isAdmin = !!on;
    $('admin-btn').classList.toggle('hidden', !isAdmin);
  }

  async function admCall(action, params) {
    const res = await window.tokkyo.rankAdmin(action, params || {}, currentUser);
    if (res && res.error === 'forbidden') admStatus.textContent = t('adm.forbidden');
    return res || {};
  }

  function admRow(u) {
    const it = document.createElement('div');
    it.className = 'adm-item' + (u.banned ? ' is-banned' : '');

    const who = document.createElement('div');
    who.className = 'adm-who';
    const name = document.createElement('div');
    name.className = 'adm-name';
    name.textContent = u.username || '?';
    if (u.banned) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = t('adm.banned');
      name.appendChild(tag);
    }
    const meta = document.createElement('div');
    meta.className = 'adm-meta';
    meta.textContent = u.discord_id;
    who.append(name, meta);

    const score = document.createElement('div');
    score.className = 'adm-score';
    score.textContent = nf(u.score);

    const acts = document.createElement('div');
    acts.className = 'adm-actions';

    const mk = (label, cls, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener('click', fn);
      return b;
    };

    acts.appendChild(mk(t('adm.set'), '', async () => {
      const v = window.prompt(t('adm.askScore', { name: u.username }), String(u.score));
      if (v === null) return;
      const n = parseInt(v, 10);
      if (isNaN(n)) return;
      await admCall('setScore', { target: u.discord_id, score: n });
      admLoad();
    }));

    acts.appendChild(mk(t('adm.add'), '', async () => {
      const v = window.prompt(t('adm.askDelta', { name: u.username }), '1000');
      if (v === null) return;
      const n = parseInt(v, 10);
      if (isNaN(n)) return;
      await admCall('addScore', { target: u.discord_id, delta: n });
      admLoad();
    }));

    acts.appendChild(u.banned
      ? mk(t('adm.unban'), '', async () => { await admCall('unban', { target: u.discord_id }); admLoad(); })
      : mk(t('adm.ban'), 'danger', async () => {
          if (!window.confirm(t('adm.confirmBan', { name: u.username }))) return;
          await admCall('ban', { target: u.discord_id });
          admLoad();
        }));

    it.append(who, score, acts);
    return it;
  }

  async function admLoad() {
    admStatus.textContent = t('adm.loading');
    admList.innerHTML = '';
    try {
      const res = await admCall('list', { query: admQuery.value.trim() });
      const rows = res.rows || [];
      rows.forEach((u) => admList.appendChild(admRow(u)));
      if (!admStatus.textContent.startsWith(t('adm.forbidden').slice(0, 10))) {
        admStatus.textContent = rows.length ? '' : t('adm.empty');
      }
    } catch (e) {
      admStatus.textContent = t('adm.error');
    }
  }

  $('admin-btn').addEventListener('click', () => {
    admMode.textContent = SB.secureRanking ? t('adm.secure') : t('adm.weak');
    openOverlay(admOverlay);
    admLoad();
  });
  $('adm-close').addEventListener('click', () => closeOverlay(admOverlay));
  $('adm-refresh').addEventListener('click', admLoad);
  admQuery.addEventListener('keydown', (e) => { if (e.key === 'Enter') admLoad(); });
  admOverlay.addEventListener('mousedown', (e) => { if (e.target === admOverlay) closeOverlay(admOverlay); });

  // ================= COLOR DE LA INTERFAZ =================
  // La app es blanco y negro: los tonos de la interfaz son blancos y grises.
  const ACCENTS = ['#ffffff', '#d9d9de', '#a9a9b0', '#7d7d85'];

  function applyAccent(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    // luminancia para decidir si el texto encima va negro o blanco
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const s = document.documentElement.style;
    s.setProperty('--accent', hex);
    s.setProperty('--accent-ink', lum > 0.6 ? '#0b0c0f' : '#ffffff');
    s.setProperty('--accent-soft', `rgba(${r},${g},${b},.16)`);
    ls.setItem('tk_accent', hex);
    document.querySelectorAll('#accent-swatches .swatch').forEach((el) => {
      el.classList.toggle('on', el.dataset.color.toLowerCase() === hex.toLowerCase());
    });
    const inp = $('accent-input');
    if (inp && inp.value.toLowerCase() !== hex.toLowerCase()) inp.value = hex;
    kb.setGlowColor(hex);   // la luz del teclado sigue el mismo color
  }

  ACCENTS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.color = c;
    b.style.setProperty('--sw', c);
    b.title = c;
    b.addEventListener('click', () => applyAccent(c));
    $('accent-swatches').appendChild(b);
  });
  const accentInput = $('accent-input');
  if (accentInput) accentInput.addEventListener('input', (e) => applyAccent(e.target.value));

  // ================= IDIOMA =================
  const langBtn = $('lang-btn');
  const langPop = $('lang-pop');
  const langShort = $('lang-short');

  function setLang(code) {
    i18n.apply(code);
    ls.setItem('tk_lang', code);
    const info = i18n.LANGS.find((l) => l.code === i18n.lang);
    langShort.textContent = info ? info.short : code.toUpperCase();
    langPop.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.lang === i18n.lang));
    buildPackOptions();   // los nombres de las categorias van traducidos
    // "Invitado" es texto nuestro, no viene de Discord: hay que refrescarlo
    if (currentUser && currentUser.id === 'local') userName.textContent = t('user.guest');
  }

  i18n.LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.dataset.lang = l.code;
    const name = document.createElement('span');
    name.textContent = l.label;
    const code = document.createElement('span');
    code.className = 'lang-code';
    code.textContent = l.short;
    b.append(name, code);
    b.addEventListener('click', () => { setLang(l.code); langPop.classList.add('hidden'); });
    langPop.appendChild(b);
  });

  langBtn.addEventListener('click', (e) => { e.stopPropagation(); langPop.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.lang-wrap')) langPop.classList.add('hidden'); });

  // ================= ARRANQUE =================
  window.tokkyo.setCloseToTray(ls.getItem('tk_close_to_tray') !== '0');
  setLang(i18n.detect());
  applyAppTheme(ls.getItem('tk_app_theme') || 'dark');
  // un color de antes (morado, azul...) vuelve al blanco: ya no existen
  const savedAccent = (ls.getItem('tk_accent') || '').toLowerCase();
  applyAccent(ACCENTS.includes(savedAccent) ? savedAccent : '#ffffff');

  // la ilustracion de la toolbar es opcional: si falta, se oculta el hueco
  const artEl = $('toolbar-art');
  if (artEl) artEl.addEventListener('error', () => { artEl.closest('.ctrl-art').style.display = 'none'; });

  // Sin ranking global (porque no hay login de Discord) no mostramos su boton.
  if (!SB.rankingEnabled) { const rb = $('rank-btn'); if (rb) rb.style.display = 'none'; }

  initPacks();
  (async function checkSession() {
    if (!SB.loginEnabled) {
      showApp({ id: 'local', username: 'local', display: t('user.guest'), avatar: '' });
      return;
    }
    try {
      const user = await window.tokkyo.getSession();
      if (user) showApp(user);
    } catch (e) { /* sin sesion */ }
  })();
})();
