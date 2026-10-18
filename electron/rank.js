'use strict';
/*
 * Puente entre la app y el ranking.
 *
 * Vive en el proceso principal porque necesita el token de Discord, que no se
 * expone al renderer: la interfaz pide las cosas por IPC y aquí se firman.
 *
 * Dos modos:
 *
 *  · SEGURO (hay RANK_FUNCTION_URL): todo pasa por la Edge Function, que
 *    comprueba la identidad contra Discord, frena las subidas imposibles y es
 *    la única que decide qué se guarda. Ver server/README.md.
 *
 *  · DIRECTO (no hay función desplegada): se habla con la base de datos como
 *    antes. Cómodo para que la app funcione desde el primer momento, pero un
 *    usuario avispado puede falsear su puntuación. Es el modo de reserva.
 */
const cfg = require('./config');
const auth = require('./auth');

const FN = cfg.RANK_FUNCTION_URL || '';
const SEASON = cfg.RANK_SEASON || 's2-';
const REST = cfg.SUPABASE_URL ? cfg.SUPABASE_URL + '/rest/v1/leaderboard' : '';

const secure = () => !!FN;
const enabled = () => !!(FN || (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY));
const seasonId = (id) => (String(id).startsWith(SEASON) ? String(id) : SEASON + id);
const bareId = (id) => String(id || '').replace(SEASON, '');

const restHeaders = (extra) => Object.assign({
  apikey: cfg.SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
}, extra || {});

async function callFn(action, payload) {
  const body = Object.assign({ action }, payload || {});
  if (action !== 'top') {
    const token = auth.getToken();
    if (!token) return { error: 'auth' };
    body.token = token;
  }
  try {
    const r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    return { error: 'network' };
  }
}

// ---------------------------------------------------------------- lectura
async function top() {
  if (!enabled()) return { rows: [] };
  if (secure()) {
    const r = await callFn('top');
    return { rows: r.rows || [] };
  }
  try {
    const r = await fetch(
      `${REST}?select=discord_id,username,avatar,score&discord_id=like.${SEASON}*&score=gt.0&order=score.desc&limit=50`,
      { headers: restHeaders() }
    );
    const rows = await r.json();
    return { rows: (Array.isArray(rows) ? rows : []).map((x) => Object.assign({}, x, { discord_id: bareId(x.discord_id) })) };
  } catch (e) {
    return { rows: [] };
  }
}

async function me(userId) {
  if (!enabled()) return { score: 0, rank: null, banned: false, admin: false };
  if (secure()) {
    const r = await callFn('me');
    return { score: r.score || 0, rank: r.rank || null, banned: !!r.banned, admin: !!r.admin };
  }
  try {
    const r = await fetch(`${REST}?select=score&discord_id=eq.${encodeURIComponent(seasonId(userId))}`, { headers: restHeaders() });
    const rows = await r.json();
    const raw = (rows && rows[0]) ? Number(rows[0].score) || 0 : 0;
    const score = Math.max(0, raw);
    let rank = null;
    if (score > 0) {
      // cuantos van por delante -> tu posicion, aunque estes fuera del top
      const c = await fetch(`${REST}?select=discord_id&discord_id=like.${SEASON}*&score=gt.${score}`, {
        headers: restHeaders({ Prefer: 'count=exact', Range: '0-0' })
      });
      const cr = c.headers.get('content-range');
      const total = cr ? parseInt(cr.split('/')[1], 10) : NaN;
      if (!isNaN(total)) rank = total + 1;
    }
    return { score, rank, banned: raw < 0, admin: isAdminId(userId) };
  } catch (e) {
    return { score: 0, rank: null, banned: false, admin: isAdminId(userId) };
  }
}

// ---------------------------------------------------------------- escritura
async function sync(user, score) {
  if (!enabled() || !user) return { score: score };
  if (secure()) {
    const r = await callFn('sync', { score });
    return { score: typeof r.score === 'number' ? r.score : score, banned: !!r.banned, capped: !!r.capped };
  }
  try {
    await fetch(REST, {
      method: 'POST',
      headers: restHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        discord_id: seasonId(user.id),
        username: user.display,
        avatar: user.avatar,
        score,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) { /* ignore */ }
  return { score };
}

// ---------------------------------------------------------------- admin
// El id de admin solo sirve para MOSTRAR el panel. Quien manda de verdad es el
// servidor: sin la función desplegada, cualquiera podría hacer esto a mano.
function isAdminId(id) {
  return !!cfg.ADMIN_DISCORD_ID && String(id) === String(cfg.ADMIN_DISCORD_ID);
}

async function admin(action, params, currentUser) {
  if (secure()) return await callFn('admin.' + action, params);
  if (!isAdminId(currentUser && currentUser.id)) return { error: 'forbidden' };

  const target = params && params.target ? seasonId(params.target) : null;
  try {
    if (action === 'list') {
      const q = (params && params.query || '').trim();
      let url = `${REST}?select=discord_id,username,score&discord_id=like.${SEASON}*&order=score.desc&limit=50`;
      if (q) url += `&username=ilike.*${encodeURIComponent(q)}*`;
      const rows = await (await fetch(url, { headers: restHeaders() })).json();
      return {
        rows: (Array.isArray(rows) ? rows : []).map((r) => ({
          discord_id: bareId(r.discord_id),
          username: r.username,
          score: Math.max(0, Number(r.score) || 0),
          banned: (Number(r.score) || 0) < 0
        }))
      };
    }
    if (action === 'setScore' || action === 'addScore') {
      let score = Math.max(0, Math.floor(Number(params.score) || 0));
      if (action === 'addScore') {
        const rows = await (await fetch(`${REST}?select=score&discord_id=eq.${encodeURIComponent(target)}`, { headers: restHeaders() })).json();
        const cur = (rows && rows[0]) ? Number(rows[0].score) || 0 : 0;
        score = Math.max(0, cur + Math.floor(Number(params.delta) || 0));
      }
      await fetch(`${REST}?discord_id=eq.${encodeURIComponent(target)}`, {
        method: 'PATCH',
        headers: restHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ score, updated_at: new Date().toISOString() })
      });
      return { ok: true, score };
    }
    if (action === 'ban' || action === 'unban') {
      // sin servidor, el baneo se marca con un score negativo que la app respeta
      await fetch(`${REST}?discord_id=eq.${encodeURIComponent(target)}`, {
        method: 'PATCH',
        headers: restHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ score: action === 'ban' ? -1 : 0, updated_at: new Date().toISOString() })
      });
      return { ok: true, weak: true };
    }
    if (action === 'bans') {
      const rows = await (await fetch(`${REST}?select=discord_id,username&discord_id=like.${SEASON}*&score=lt.0`, { headers: restHeaders() })).json();
      return { rows: (Array.isArray(rows) ? rows : []).map((r) => ({ discord_id: bareId(r.discord_id), motivo: r.username })) };
    }
  } catch (e) { /* ignore */ }
  return { error: 'action' };
}

module.exports = { top, me, sync, admin, isAdminId, secure, enabled };
