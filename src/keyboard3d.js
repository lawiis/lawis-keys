'use strict';
/*
 * Teclado F75 en 3D (CSS transforms, sin WebGL ni librerias).
 *
 * Port a JS plano del componente "Teclado F75 3D" hecho en Claude Design: el
 * original venia como .dc.html y dependia de un runtime propio y de Google
 * Fonts, dos cosas que aqui no valen (la app va sin red y con CSP estricto).
 *
 * Cada tecla es una pila de rebanadas con translateZ que simula el perfil del
 * keycap. El sonido NO lo hace este modulo: avisa por onDown/onUp y lo toca el
 * motor de audio de la app, para que suenen los packs de verdad.
 */
(function () {
  const U = 56, GAP = 5, ROW = 56, FNGAP = 12, CAPH = 26, TAP = 2.6, EDGE = 3.2, NSL = 12;
  const BW = 16 * U, BD = 343, BZ = 16, BZB = 22;
  const CW = BW + BZ * 2, CD = BD + BZ + BZB;
  const Z_BASE = 26, Z_BAR = 34, Z_BEZ = 56, Z_PLATE = 44;
  const INS0 = TAP + EDGE;

  const A = (c) => [c, '', 1, 'Key' + c, 'alpha'];
  const F = (n) => ['F' + n, '', 1, 'F' + n, 'mod'];

  const ROWS = [
    [['Esc', '', 1, 'Escape', 'acc'], F(1), F(2), F(3), F(4), F(5), F(6), F(7), F(8), F(9), F(10), F(11), F(12), ['Del', '', 1, 'Delete', 'mod']],
    [['`', '~', 1, 'Backquote', 'mod'], ['1', '!', 1, 'Digit1', 'alpha'], ['2', '@', 1, 'Digit2', 'alpha'], ['3', '#', 1, 'Digit3', 'alpha'], ['4', '$', 1, 'Digit4', 'alpha'], ['5', '%', 1, 'Digit5', 'alpha'], ['6', '^', 1, 'Digit6', 'alpha'], ['7', '&', 1, 'Digit7', 'alpha'], ['8', '*', 1, 'Digit8', 'alpha'], ['9', '(', 1, 'Digit9', 'alpha'], ['0', ')', 1, 'Digit0', 'alpha'], ['-', '_', 1, 'Minus', 'alpha'], ['=', '+', 1, 'Equal', 'alpha'], ['Backspace', '', 2, 'Backspace', 'mod'], ['Home', '', 1, 'Home', 'mod']],
    [['Tab', '', 1.5, 'Tab', 'mod'], A('Q'), A('W'), A('E'), A('R'), A('T'), A('Y'), A('U'), A('I'), A('O'), A('P'), ['[', '{', 1, 'BracketLeft', 'alpha'], [']', '}', 1, 'BracketRight', 'alpha'], ['\\', '|', 1.5, 'Backslash', 'mod'], ['PgUp', '', 1, 'PageUp', 'mod']],
    [['Caps', '', 1.75, 'CapsLock', 'mod'], A('A'), A('S'), A('D'), A('F'), A('G'), A('H'), A('J'), A('K'), A('L'), [';', ':', 1, 'Semicolon', 'alpha'], ["'", '"', 1, 'Quote', 'alpha'], ['Enter', '', 2.25, 'Enter', 'acc'], ['PgDn', '', 1, 'PageDown', 'mod']],
    [['Shift', '', 2.25, 'ShiftLeft', 'mod'], A('Z'), A('X'), A('C'), A('V'), A('B'), A('N'), A('M'), [',', '<', 1, 'Comma', 'alpha'], ['.', '>', 1, 'Period', 'alpha'], ['/', '?', 1, 'Slash', 'alpha'], ['Shift', '', 1.75, 'ShiftRight', 'mod'], ['↑', '', 1, 'ArrowUp', 'mod'], ['End', '', 1, 'End', 'mod']],
    [['Ctrl', '', 1.25, 'ControlLeft', 'mod'], ['Win', '', 1.25, 'MetaLeft', 'mod'], ['Alt', '', 1.25, 'AltLeft', 'mod'], ['', '', 6.25, 'Space', 'alpha'], ['Alt', '', 1, 'AltRight', 'mod'], ['Fn', '', 1, 'Fn', 'mod'], ['Ctrl', '', 1, 'ControlRight', 'mod'], ['←', '', 1, 'ArrowLeft', 'mod'], ['↓', '', 1, 'ArrowDown', 'mod'], ['→', '', 1, 'ArrowRight', 'mod']]
  ];

  // Paletas en escala de grises: la app entera es blanco y negro
  const THEMES = {
    Panda: {
      // los modificadores van un punto por encima de la placa: si son del mismo
      // negro se funden con ella y parece que falten teclas
      caseLow: '#1a1b1e', bezel: '#0e0f11', plate: '#07080a',
      alpha: '#f6f6f6', alphaTx: '#111216', mod: '#212227', modTx: '#eaeaec',
      acc: '#212227', accTx: '#f6f6f6', knob: '#f4f4f4', knobTx: '#111216'
    },
    Blanco: {
      caseLow: '#3c3d40', bezel: '#eeeeee', plate: '#17181b',
      alpha: '#f7f7f7', alphaTx: '#141519', mod: '#26272a', modTx: '#f2f2f2',
      acc: '#141519', accTx: '#f7f7f7', knob: '#1b1c20', knobTx: '#f2f2f2'
    },
    Negro: {
      caseLow: '#0c0d0f', bezel: '#1c1d20', plate: '#08090b',
      alpha: '#2c2d30', alphaTx: '#f4f4f4', mod: '#141518', modTx: '#a8a9ac',
      acc: '#f2f2f2', accTx: '#111216', knob: '#f2f2f2', knobTx: '#111216'
    }
  };

  const FACE_KEYS = { Escape: 'happy', CapsLock: 'sleepy', Enter: 'wink', Space: 'kawaii' };

  /*
   * Inclinacion de reposo y tamano que ocupa el teclado YA proyectado en pantalla.
   * Con rotateX/rotateZ no vale medir por su tamano real: el giro lo aplana en
   * vertical y lo ensancha en horizontal. PROJ_W/PROJ_H son esas medidas con el
   * balanceo en su punto mas extremo, para que nunca se salga del marco.
   * Las teclas sobresalen hacia arriba al estar elevadas en Z, y eso descoloca el
   * centro: RISE lo compensa bajando el conjunto.
   */
  const BASE_RX = 54, BASE_RZ = -10;
  const PROJ_W = 1004, PROJ_H = 274, RISE = 32;

  function sh(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = (i) => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
  }

  function el(styles, tag) {
    const d = document.createElement(tag || 'div');
    if (styles) Object.assign(d.style, styles);
    return d;
  }

  class Keyboard3D {
    constructor(stage, opts) {
      const o = opts || {};
      this.stage = stage;
      this.onDown = o.onDown || function () {};
      this.onUp = o.onUp || function () {};
      this.themeName = o.theme || 'Panda';
      this.lighting = o.lighting || 'react';   // react | solid | breathe | off
      this.bright = o.brightness == null ? 0.85 : o.brightness;
      this.glowColor = o.glowColor || '#ffffff';
      this.sway = o.sway !== false;
      // interactive:false -> el teclado solo se mueve con su propio balanceo;
      // ni se gira arrastrando ni se acerca con la rueda
      this.interactive = o.interactive === true;

      this.caps = {};
      this.glows = {};
      this.downKeys = new Set();
      this.rx = BASE_RX; this.rz = BASE_RZ; this.zoom = 1;
      this.swayT = 0;

      this._build();
      this._bind();
    }

    theme() { return THEMES[this.themeName] || THEMES.Panda; }

    // ---------- geometria ----------
    box(x, y, z, w, d, h, top, side, radius) {
      const base = { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', backfaceVisibility: 'hidden' };
      const wrap = el({ position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: d + 'px', transformStyle: 'preserve-3d', transform: 'translateZ(' + z + 'px)' });
      const faces = [
        Object.assign({}, base, { width: w + 'px', height: h + 'px', transform: 'translateZ(' + h + 'px) rotateX(-90deg)', background: sh(side, 0.6) }),
        Object.assign({}, base, { width: w + 'px', height: h + 'px', transform: 'translateY(' + d + 'px) translateZ(' + h + 'px) rotateX(-90deg)', background: sh(side, 1.06) }),
        Object.assign({}, base, { width: h + 'px', height: d + 'px', transform: 'translateX(' + w + 'px) rotateY(-90deg)', background: sh(side, 0.8) }),
        Object.assign({}, base, { width: h + 'px', height: d + 'px', transform: 'rotateY(-90deg)', background: sh(side, 0.72) }),
        Object.assign({}, base, { width: w + 'px', height: d + 'px', transform: 'translateZ(' + h + 'px)', background: top, borderRadius: (radius || 0) + 'px' })
      ];
      faces.forEach((f) => wrap.appendChild(el(f)));
      return wrap;
    }

    slices(parent, w, d, bg) {
      // Base biselada limpia de 1 nivel: reduce ~1000 nodos DOM y acelera renderizado
      const z = CAPH * 0.45;
      const ins = TAP * 0.55;
      parent.appendChild(el({
        position: 'absolute', left: ins.toFixed(2) + 'px', top: ins.toFixed(2) + 'px',
        width: (w - 2 * ins).toFixed(2) + 'px', height: (d - 2 * ins).toFixed(2) + 'px',
        borderRadius: '7px', transform: 'translateZ(' + z.toFixed(2) + 'px)',
        background: sh(bg, 0.72), pointerEvents: 'none'
      }));
    }

    face(parent, kind, fw, fh, tx) {
      const s = Math.max(0.9, Math.min(2.2, Math.min(fh / 20, fw / 28)));
      const px = (n) => (n * s).toFixed(1) + 'px';
      const arc = { boxSizing: 'content-box', width: px(7), height: px(3.4), borderTop: px(2.4) + ' solid ' + tx, borderLeft: px(2.2) + ' solid transparent', borderRight: px(2.2) + ' solid transparent', borderRadius: '60% 60% 0 0' };
      const round = { width: px(5.4), height: px(7.2), borderRadius: '50%', background: tx, boxShadow: 'inset ' + px(1.3) + ' ' + px(-1.7) + ' 0 0 rgba(255,255,255,.5)' };
      const line = { width: px(8.6), height: px(2.2), borderRadius: px(1.1), background: tx };
      const eye = kind === 'happy' ? arc : kind === 'sleepy' ? line : round;
      const eyeL = kind === 'wink' ? round : eye;
      const eyeR = kind === 'wink' ? arc : eye;
      const mouth = kind === 'sleepy'
        ? { boxSizing: 'content-box', width: px(3.4), height: px(3.4), borderRadius: '50%', border: px(1.7) + ' solid ' + tx }
        : { boxSizing: 'content-box', width: px(7.6), height: px(3.6), borderBottom: px(2.2) + ' solid ' + tx, borderLeft: px(2.1) + ' solid transparent', borderRight: px(2.1) + ' solid transparent', borderRadius: '0 0 75% 75%' };
      const abs = { position: 'absolute', transform: 'translate(-50%,-50%)', pointerEvents: 'none' };
      const blush = { width: px(5), height: px(2.6), borderRadius: '50%', background: tx, opacity: kind === 'kawaii' ? 0.24 : 0 };

      const wrap = el({ position: 'absolute', left: '50%', top: '50%', width: px(26), height: px(18), transform: 'translate(-50%,-50%)', pointerEvents: 'none' });
      wrap.appendChild(el(Object.assign({}, abs, blush, { left: '4%', top: '66%' })));
      wrap.appendChild(el(Object.assign({}, abs, blush, { left: '96%', top: '66%' })));
      wrap.appendChild(el(Object.assign({}, abs, eyeL, { left: '25%', top: '32%' })));
      wrap.appendChild(el(Object.assign({}, abs, eyeR, { left: '75%', top: '32%' })));
      wrap.appendChild(el(Object.assign({}, abs, mouth, { left: '50%', top: '80%' })));
      parent.appendChild(wrap);
    }

    // ---------- montaje ----------
    _build() {
      const t = this.theme();
      this.stage.innerHTML = '';
      Object.assign(this.stage.style, {
        perspective: '2400px', perspectiveOrigin: '50% 46%', touchAction: 'none',
        cursor: this.interactive ? 'grab' : 'default'
      });

      const board = el({
        position: 'absolute', left: '50%', top: '50%', width: CW + 'px', height: CD + 'px',
        marginLeft: -(CW / 2) + 'px', marginTop: '-176px', transformStyle: 'preserve-3d'
      });
      this.board = board;
      this.stage.appendChild(board);

      // sombra estatica proyectada bajo la carcasa sin blur de GPU
      board.appendChild(el({
        position: 'absolute', left: '-96px', top: '-44px', width: '1120px', height: '478px',
        transform: 'translateZ(-7px)', pointerEvents: 'none',
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.75) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,0) 70%)'
      }));

      // carcasa, marcos y placa
      board.appendChild(this.box(0, 0, 0, CW, CD, Z_BASE, sh(t.caseLow, 0.9), t.caseLow, 15));
      board.appendChild(this.box(0, 0, Z_BAR, CW, BZ, Z_BEZ - Z_BAR, 'linear-gradient(180deg,' + sh(t.bezel, 1.1) + ',' + t.bezel + ')', t.bezel, 5));
      board.appendChild(this.box(0, CD - BZB, Z_BAR, CW, BZB, Z_BEZ - Z_BAR, 'linear-gradient(180deg,' + t.bezel + ',' + sh(t.bezel, 0.9) + ')', t.bezel, 5));
      board.appendChild(this.box(0, BZ, Z_BAR, BZ, CD - BZ - BZB, Z_BEZ - Z_BAR, sh(t.bezel, 1.03), t.bezel, 0));
      board.appendChild(this.box(CW - BZ, BZ, Z_BAR, BZ, CD - BZ - BZB, Z_BEZ - Z_BAR, sh(t.bezel, 1.03), t.bezel, 0));
      board.appendChild(this.box(BZ, BZ, Z_BAR, BW, BD, Z_PLATE - Z_BAR, 'linear-gradient(160deg,' + sh(t.plate, 1.5) + ' 0%,' + t.plate + ' 42%,' + sh(t.plate, 0.8) + ' 100%)', t.plate, 3));

      const plate = el({ position: 'absolute', left: '16px', top: '16px', width: BW + 'px', height: BD + 'px', transform: 'translateZ(44px)', transformStyle: 'preserve-3d' });
      board.appendChild(plate);
      this._buildKeys(plate);
      this._buildKnob(board);
      this.applyBoard();
      this.applyBright();
    }

    _buildKeys(plate) {
      const t = this.theme();
      const m = this.lighting;
      this.caps = {}; this.glows = {};

      ROWS.forEach((row, r) => {
        let ux = 0;
        const y = r === 0 ? 0 : ROW + FNGAP + (r - 1) * ROW;
        row.forEach((def) => {
          const label = def[0], sub = def[1], u = def[2], code = def[3], tone = def[4];
          const x = ux * U, w = u * U - GAP, d = ROW - GAP;
          ux += u;
          const bg = tone === 'acc' ? t.acc : tone === 'mod' ? t.mod : t.alpha;
          const tx = tone === 'acc' ? t.accTx : tone === 'mod' ? t.modTx : t.alphaTx;
          const long = label.length > 2;
          const delay = -(((x / BW) * 1.7 + (y / BD) * 1.0)).toFixed(2) + 's';
          const kind = FACE_KEYS[code];
          const hasFace = !!kind;
          const tw = w - 2 * INS0, td = d - 2 * INS0;

          const wrap = el({ position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: d + 'px', transformStyle: 'preserve-3d' });

          const glow = el({
            position: 'absolute', left: '-3px', top: '-3px', width: (w + 6) + 'px', height: (d + 6) + 'px',
            borderRadius: '8px', transform: 'translateZ(2px)', pointerEvents: 'none',
            boxShadow: '0 0 10px ' + this.glowColor,
            opacity: m === 'off' || m === 'react' ? 0 : this.bright,
            background: 'transparent',
            transition: m === 'react' ? 'opacity .35s ease-out' : 'none'
          });
          wrap.appendChild(glow);

          const cap = el({ position: 'absolute', left: 0, top: 0, width: w + 'px', height: d + 'px', transformStyle: 'preserve-3d', transition: 'transform .05s cubic-bezier(.2,.85,.3,1)' });
          this.slices(cap, w, d, bg);

          const ft = el({
            position: 'absolute', left: INS0 + 'px', top: INS0 + 'px', width: tw + 'px', height: td + 'px',
            transformOrigin: '0 0', transform: 'translateZ(' + (CAPH + 0.2) + 'px)',
            background: 'radial-gradient(120% 150% at 50% 0%, ' + sh(bg, 1.13) + ' 0%, ' + bg + ' 55%, ' + sh(bg, 0.95) + ' 100%)',
            borderRadius: '8px', pointerEvents: 'auto', cursor: 'pointer',
            boxShadow: 'inset 0 -1px 0 ' + sh(bg, 0.84) + ', inset 0 1px 0 ' + sh(bg, 1.22) + ', inset 0 7px 14px -9px rgba(0,0,0,.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', overflow: 'hidden'
          });

          if (sub) {
            const s = el({ fontFamily: "'JetBrains Mono',ui-monospace,Consolas,monospace", fontSize: '10.5px', fontWeight: 500, lineHeight: 1, color: tx, opacity: 0.74 });
            s.textContent = sub;
            ft.appendChild(s);
          }
          if (!hasFace) {
            const mn = el({ fontFamily: "'JetBrains Mono',ui-monospace,Consolas,monospace", fontSize: (long ? 9 : 13) + 'px', fontWeight: long ? 500 : 700, lineHeight: 1, letterSpacing: long ? '.04em' : '0', color: tx, whiteSpace: 'nowrap' });
            mn.textContent = label;
            ft.appendChild(mn);
          } else {
            this.face(ft, kind, tw, td, tx);
            if (code !== 'Space') {
              const c = el({ position: 'absolute', right: '5px', bottom: '4px', fontFamily: "'JetBrains Mono',ui-monospace,Consolas,monospace", fontSize: '8px', fontWeight: 500, letterSpacing: '.04em', lineHeight: 1, color: tx, opacity: 0.72, pointerEvents: 'none' });
              c.textContent = code === 'Enter' ? '↵' : label;
              ft.appendChild(c);
            }
          }

          const led = el({ position: 'absolute', right: '4px', top: '4px', width: '4px', height: '4px', borderRadius: '50%', background: '#e9eaee', opacity: 0, transition: 'opacity .18s', boxShadow: '0 0 7px rgba(255,255,255,.9)' });
          ft.appendChild(led);
          if (code === 'CapsLock') this.capsLed = led;

          ft.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.mouseKey = code;
            this.press(code, true);
          });

          cap.appendChild(ft);
          wrap.appendChild(cap);
          plate.appendChild(wrap);

          this.caps[code] = cap;
          this.glows[code] = glow;
        });
      });
    }

    _buildKnob(board) {
      const t = this.theme(), n = 11, R = 34, cx = 851, cy = 26;
      const wrap = el({ position: 'absolute', left: 0, top: 0, width: CW + 'px', height: CD + 'px', transformStyle: 'preserve-3d', pointerEvents: 'none' });
      for (let i = 0; i < n; i++) {
        const p = i / (n - 1);
        const r = R - 4 * Math.pow(Math.abs(p - 0.55) * 2, 2);
        const z = Z_BEZ - 8 + p * 26;
        const f = 0.5 + p * 0.55;
        wrap.appendChild(el({
          position: 'absolute', left: (cx - r) + 'px', top: (cy - r) + 'px', width: (r * 2) + 'px', height: (r * 2) + 'px',
          borderRadius: '50%', transform: 'translateZ(' + z.toFixed(1) + 'px)',
          background: i === n - 1
            ? 'radial-gradient(circle at 38% 28%, ' + sh(t.knob, 1.5) + ' 0%, ' + t.knob + ' 54%, ' + sh(t.knob, 0.68) + ' 100%)'
            : 'repeating-conic-gradient(from 0deg, ' + sh(t.knob, f) + ' 0deg 5deg, ' + sh(t.knob, f * 0.72) + ' 5deg 10deg)',
          boxShadow: i === n - 1 ? 'inset 0 0 0 3px ' + sh(t.knob, 0.58) + ', inset 0 -6px 12px -6px rgba(0,0,0,.6)' : 'none'
        }));
      }
      wrap.appendChild(el({
        position: 'absolute', left: (cx - 1.6) + 'px', top: (cy - 27) + 'px', width: '3.2px', height: '13px',
        borderRadius: '2px', background: t.knobTx, transform: 'translateZ(' + (Z_BEZ + 18.4) + 'px)', boxShadow: '0 0 8px rgba(255,255,255,.3)'
      }));
      board.appendChild(wrap);
    }

    // ---------- interaccion ----------
    _bind() {
      this._onStageDown = (e) => {
        this.orbit = { x: e.clientX, y: e.clientY, rx: this.rx, rz: this.rz };
        this.stage.style.cursor = 'grabbing';
      };
      this._onWheel = (e) => {
        e.preventDefault();
        this.zoom = Math.max(0.4, Math.min(1.8, this.zoom - e.deltaY * 0.0012));
        this.applyBoard();
      };
      this._onMove = (e) => {
        if (!this.orbit) return;
        this.rz = Math.max(-42, Math.min(42, this.orbit.rz + (e.clientX - this.orbit.x) * 0.22));
        this.rx = Math.max(14, Math.min(84, this.orbit.rx + (e.clientY - this.orbit.y) * 0.18));
        this.applyBoard();
      };
      this._onUp = () => {
        if (this.mouseKey) { this.release(this.mouseKey, true); this.mouseKey = null; }
        if (this.orbit) { this.orbit = null; this.swayT = null; }   // tras girar a mano, no vuelve a mecerse
        if (this.interactive) this.stage.style.cursor = 'grab';
      };
      this._onResize = () => this.fit();

      if (this.interactive) {
        this.stage.addEventListener('pointerdown', this._onStageDown);
        this.stage.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('pointermove', this._onMove);
      } else {
        this.stage.style.cursor = 'default';
      }
      window.addEventListener('pointerup', this._onUp);
      window.addEventListener('resize', this._onResize);

      this.fit();
      // el flex de la pagina puede no tener alto definitivo en el primer frame
      requestAnimationFrame(() => this.fit());
      if (this.sway) this._loop();
    }

    _loop() {
      if (!this.sway || this.orbit || this.swayT === null) {
        this.raf = null;
        return;
      }
      this.swayT += 0.006;
      this.rz = BASE_RZ + Math.sin(this.swayT) * 13;
      this.rx = BASE_RX + Math.cos(this.swayT * 0.7) * 5;
      this.applyBoard();
      this.raf = requestAnimationFrame(() => this._loop());
    }

    fit() {
      const r = this.stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const w = (r.width - 48) / PROJ_W;
      const h = (r.height - 26) / PROJ_H;
      this.zoom = Math.max(0.3, Math.min(1.5, Math.min(w, h)));
      this.applyBoard();
    }

    applyBoard() {
      if (!this.board) return;
      const z = this.zoom;
      this.board.style.transform =
        'translateY(' + (RISE * z).toFixed(1) + 'px) ' +
        'scale3d(' + z + ',' + z + ',' + z + ') rotateX(' + this.rx + 'deg) rotateZ(' + this.rz + 'deg)';
    }

    applyBright() {
      const m = this.lighting;
      if (m === 'react' || m === 'off') {
        Object.keys(this.glows).forEach((k) => { this.glows[k].style.opacity = 0; });
        return;
      }
      Object.keys(this.glows).forEach((k) => { this.glows[k].style.opacity = this.bright; });
    }

    press(code, fromMouse) {
      if (this.downKeys.has(code)) return;
      this.downKeys.add(code);
      const c = this.caps[code];
      if (c) c.style.transform = 'translateZ(-11px)';
      const g = this.glows[code];
      if (g && this.lighting === 'react') {
        g.style.transition = 'none';
        g.style.opacity = this.bright;
        requestAnimationFrame(() => { g.style.transition = 'opacity .55s ease-out'; g.style.opacity = 0; });
      } else if (g && this.lighting !== 'off') {
        g.style.transition = 'none';
        g.style.opacity = Math.min(1, this.bright * 1.9);
      }
      this.onDown(code, !!fromMouse);
    }

    release(code, fromMouse) {
      if (!this.downKeys.has(code)) return;
      this.downKeys.delete(code);
      const c = this.caps[code];
      if (c) c.style.transform = '';
      const g = this.glows[code];
      if (g && this.lighting !== 'react' && this.lighting !== 'off') {
        g.style.transition = 'opacity .28s ease-out';
        g.style.opacity = this.bright;
      }
      this.onUp(code, !!fromMouse);
    }

    releaseAll() { Array.from(this.downKeys).forEach((c) => this.release(c)); }

    setCapsLed(on) { if (this.capsLed) this.capsLed.style.opacity = on ? 1 : 0; }

    has(code) { return !!this.caps[code]; }

    setTheme(name) {
      if (!THEMES[name]) return;
      this.themeName = name;
      const keep = new Set(this.downKeys);
      this._build();
      keep.forEach((c) => this.press(c));
    }

    setLighting(mode) { this.lighting = mode; this._build(); }

    // Cambia el color de la luz sin rehacer el teclado entero
    setGlowColor(hex) {
      this.glowColor = hex || '#ffffff';
      Object.keys(this.glows).forEach((k) => { this.glows[k].style.background = this.glowColor; });
    }

    setBrightness(v) { this.bright = Math.max(0, Math.min(1, v)); this.applyBright(); }
    setSway(on) {
      this.sway = !!on;
      if (on) {
        if (this.swayT === null) this.swayT = 0;
        if (!this.raf) this._loop();
      } else {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        this.rx = BASE_RX; this.rz = BASE_RZ; this.applyBoard();
      }
    }
    resetView() { this.rx = BASE_RX; this.rz = BASE_RZ; this.swayT = this.sway ? 0 : null; this.fit(); }

    destroy() {
      cancelAnimationFrame(this.raf);
      if (this.interactive) {
        this.stage.removeEventListener('pointerdown', this._onStageDown);
        this.stage.removeEventListener('wheel', this._onWheel);
        window.removeEventListener('pointermove', this._onMove);
      }
      window.removeEventListener('pointerup', this._onUp);
      window.removeEventListener('resize', this._onResize);
    }
  }

  Keyboard3D.THEMES = Object.keys(THEMES);
  window.Keyboard3D = Keyboard3D;
})();
