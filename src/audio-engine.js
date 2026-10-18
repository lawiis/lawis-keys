'use strict';
/*
 * Motor de audio de Tokkyo Keys.
 * Usa Web Audio API directamente para minima latencia y solapamiento sin lag.
 * Soporta los 3 formatos de packs de Mechvibes:
 *   - sprite  (key_define_type "single"): un archivo + defines[kc]=[offset_ms, dur_ms]
 *   - multi   (key_define_type "multi", v1): defines[kc]="archivo.wav"
 *   - v2      (version 2): genericos aleatorios press/release + overrides por tecla
 */
class TokkyoAudio {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    // dos buses: teclas y raton llevan volumen independiente
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    this.mouseBus = this.ctx.createGain();
    this.mouseBus.gain.value = 0.5;
    this.mouseBus.connect(this.ctx.destination);
    // al soltar el boton el clic suena mas flojo que al pulsarlo, como en un
    // raton de verdad: este bus cuelga del anterior con la ganancia rebajada
    this.mouseSoftBus = this.ctx.createGain();
    this.mouseSoftBus.gain.value = 0.42;
    this.mouseSoftBus.connect(this.mouseBus);

    this.volume = 0.7;
    this.mouseVolume = 0.5;
    this.mouseEnabled = true;
    this.mousePack = null;
    this.releaseEnabled = false;
    // folder -> pack cargado. El audio decodificado ocupa muchisimo mas que el
    // archivo (PCM sin comprimir), asi que con ~100 packs no se pueden guardar
    // todos: se mantienen solo los ultimos MAX_CACHED usados.
    this.cache = new Map();
    this.MAX_CACHED = 4;
    this.current = null;
  }

  // Map conserva el orden de insercion: reinsertar = marcar como reciente
  _touch(folder, pack) {
    this.cache.delete(folder);
    this.cache.set(folder, pack);
    for (const key of this.cache.keys()) {
      if (this.cache.size <= this.MAX_CACHED) break;
      if (key === folder) continue;          // nunca tires el que se acaba de usar
      this.cache.delete(key);
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.master.gain.value = this.volume;
  }

  setMouseVolume(v) {
    this.mouseVolume = Math.max(0, Math.min(1, v));
    this.mouseBus.gain.value = this.mouseVolume;
  }

  setMouseEnabled(b) { this.mouseEnabled = !!b; }

  setReleaseEnabled(b) { this.releaseEnabled = !!b; }

  /*
   * Clic de raton. Si hay un pack elegido para el raton, suena ese (asi el clic
   * puede sonar igual que un switch de verdad). Si no, cae al clic sintetizado
   * de mas abajo.
   *
   * Los packs estan indexados por tecla, asi que el clic toma prestada una: la
   * izquierda usa un alfanumerico y la derecha otro, para que no suenen calcados.
   */
  MOUSE_KEYCODE_DOWN = 30;   // KeyA
  MOUSE_KEYCODE_UP = 31;     // KeyS

  mouseClick(isDown, button) {
    if (!this.mouseEnabled || !this.mouseVolume) return;
    if (this.mousePack) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const kc = isDown && button === 2 ? this.MOUSE_KEYCODE_UP : this.MOUSE_KEYCODE_DOWN;
      this._playKey(this.mousePack, kc, isDown ? this.mouseBus : this.mouseSoftBus);
      return;
    }
    this._synthClick(isDown);
  }

  _synthClick(isDown) {
    const ac = this.ctx;
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime;
    const len = 0.03;

    const buf = ac.createBuffer(1, Math.max(1, Math.ceil(ac.sampleRate * len)), ac.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < dat.length; i++) {
      dat[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dat.length, 4.2);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = isDown ? 2600 : 3400;
    bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.value = isDown ? 0.5 : 0.28;
    src.connect(bp); bp.connect(g); g.connect(this.mouseBus);
    src.start(t0);

    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(isDown ? 420 : 560, t0);
    o.frequency.exponentialRampToValueAtTime(isDown ? 210 : 320, t0 + 0.045);
    og.gain.setValueAtTime(isDown ? 0.22 : 0.11, t0);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    o.connect(og); og.connect(this.mouseBus);
    o.start(t0);
    o.stop(t0 + 0.07);
  }

  resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }

  // Expande "press/GENERIC_R{0-4}.mp3" -> ["press/GENERIC_R0.mp3", ...]
  _expandTemplate(tpl) {
    const m = tpl && tpl.match(/\{(\d+)-(\d+)\}/);
    if (!m) return tpl ? [tpl] : [];
    const out = [];
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
    for (let i = a; i <= b; i++) out.push(tpl.replace(m[0], String(i)));
    return out;
  }

  async _decode(folder, file) {
    const bytes = await window.tokkyo.readSound(folder, file); // Uint8Array o null
    if (!bytes || !bytes.byteLength) throw new Error('archivo ausente: ' + file);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return await this.ctx.decodeAudioData(ab);
  }

  async loadPack(meta) {
    this.current = await this._getPack(meta);
    return this.current;
  }

  // Pack propio para el clic del raton (se elige aparte del de las teclas)
  async loadMousePack(meta) {
    this.mousePack = meta ? await this._getPack(meta) : null;
    return this.mousePack;
  }

  async _getPack(meta) {
    if (this.cache.has(meta.folder)) {
      const hit = this.cache.get(meta.folder);
      this._touch(meta.folder, hit);
      return hit;
    }
    const cfg = meta.config;
    const folder = meta.folder;
    const defines = cfg.defines || {};
    let pack;

    const isV2 = cfg.version === 2 || (typeof cfg.sound === 'string' && cfg.sound.indexOf('{') !== -1);
    const isSprite = !isV2 && cfg.key_define_type === 'single' && cfg.sound &&
      Object.values(defines).some((v) => Array.isArray(v));

    if (isSprite) {
      const buffer = await this._decode(folder, cfg.sound);
      const map = {};
      for (const [kc, val] of Object.entries(defines)) {
        if (Array.isArray(val)) map[kc] = val;
      }
      const keys = Object.keys(map);
      pack = { type: 'sprite', buffer, map, fallback: map[keys[0]] };
    } else if (isV2) {
      const genFiles = this._expandTemplate(cfg.sound);
      const genBufs = [];
      for (const f of genFiles) { try { genBufs.push(await this._decode(folder, f)); } catch (e) {} }
      let upBuf = null;
      if (cfg.soundup) { try { upBuf = await this._decode(folder, cfg.soundup); } catch (e) {} }
      const down = {}, up = {};
      for (const [kc, val] of Object.entries(defines)) {
        if (typeof val !== 'string') continue;
        if (kc.endsWith('-up')) {
          try { up[kc.slice(0, -3)] = await this._decode(folder, val); } catch (e) {}
        } else {
          try { down[kc] = await this._decode(folder, val); } catch (e) {}
        }
      }
      pack = { type: 'v2', genBufs, upBuf, down, up };
    } else {
      // multi v1: defines[kc] = filename
      const buffers = {};   // file -> buffer
      const map = {};       // kc -> file
      for (const [kc, val] of Object.entries(defines)) {
        if (typeof val !== 'string') continue;
        map[kc] = val;
        if (!(val in buffers)) {
          try { buffers[val] = await this._decode(folder, val); } catch (e) { buffers[val] = null; }
        }
      }
      const keys = Object.keys(map);
      pack = { type: 'multi', buffers, map, fallback: map[keys[0]] };
    }

    this._touch(folder, pack);
    return pack;
  }

  _play(buffer, offset, duration, bus) {
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    // pequena variacion natural de tono
    src.playbackRate.value = 1 + (Math.random() * 0.04 - 0.02);
    src.connect(bus || this.master);
    if (typeof offset === 'number' && typeof duration === 'number') {
      src.start(0, offset, duration);
    } else {
      src.start(0);
    }
  }

  // Reproduce el sonido de una tecla de un pack cualquiera por el bus indicado
  _playKey(pack, keycode, bus) {
    if (!pack) return;
    const kc = String(keycode);
    if (pack.type === 'sprite') {
      const d = pack.map[kc] || pack.fallback;
      if (d) this._play(pack.buffer, d[0] / 1000, d[1] / 1000, bus);
    } else if (pack.type === 'multi') {
      const file = pack.map[kc] || pack.fallback;
      if (file) this._play(pack.buffers[file], undefined, undefined, bus);
    } else if (pack.type === 'v2') {
      const b = pack.down[kc] || (pack.genBufs.length ? pack.genBufs[(Math.random() * pack.genBufs.length) | 0] : null);
      this._play(b, undefined, undefined, bus);
    }
  }

  down(keycode) { this._playKey(this.current, keycode, this.master); }

  up(keycode) {
    if (!this.releaseEnabled) return;
    const p = this.current;
    if (!p || p.type !== 'v2') return;   // solo los packs v2 traen sonido de soltar
    const b = p.up[String(keycode)] || p.upBuf;
    this._play(b);
  }
}

window.TokkyoAudio = TokkyoAudio;
