'use strict';
/*
 * Selector propio para los packs de sonido (sustituye la lista nativa de
 * Electron, que se dibuja con el estilo del sistema y no con el de la app).
 *
 * El <select> de siempre sigue ahi, oculto, y sigue siendo la fuente de verdad:
 * el renderer lo rellena, lee su value y escucha su "change" como antes. Esta
 * capa solo lo dibuja (boton + panel con buscador y categorias) y, al elegir,
 * le pone el value y dispara "change". Si el renderer reescribe las opciones
 * (cambio de idioma) o cambia el value por codigo, el boton se entera solo.
 */
(function () {
  const SVG = (d, size) => '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  const ICON_CHEVRON = SVG('M7.4 9.4 12 14l4.6-4.6L18 10.8l-6 6-6-6z', 16);
  const ICON_SEARCH = SVG('M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', 15);
  const ICON_CHECK = SVG('M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z', 15);
  const ICON_WAVE = SVG('M3 10h2v4H3v-4Zm4-3h2v10H7V7Zm4-4h2v18h-2V3Zm4 5h2v8h-2V8Zm4 3h2v2h-2v-2Z', 15);
  const ICON_MOUSE = SVG('M12 2a6 6 0 0 1 6 6v8a6 6 0 0 1-12 0V8a6 6 0 0 1 6-6Zm-1 2.08A4 4 0 0 0 8 8v1h3V4.08ZM13 4.08V9h3V8a4 4 0 0 0-3-3.92ZM16 11H8v5a4 4 0 0 0 8 0v-5Z', 15);
  const ICON_STAR = SVG('M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z', 13);

  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  let openOne = null;

  function enhance(select, opts) {
    opts = opts || {};
    const t = opts.t || ((k) => k);
    const wrap = select.closest('.select-wrap') || select.parentElement;
    wrap.classList.add('cs');
    select.classList.add('cs-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const oldArrow = wrap.querySelector('.select-arrow');
    if (oldArrow) oldArrow.remove();

    // ---- el boton -----------------------------------------------------------
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML =
      '<span class="cs-badge">' + (opts.icon === 'mouse' ? ICON_MOUSE : ICON_WAVE) + '</span>' +
      '<span class="cs-text"><span class="cs-cat"></span><span class="cs-value"></span></span>' +
      '<span class="cs-chev">' + ICON_CHEVRON + '</span>';
    wrap.appendChild(trigger);
    const catEl = trigger.querySelector('.cs-cat');
    const valueEl = trigger.querySelector('.cs-value');

    // ---- el panel (en <body>, para que nada lo recorte) -----------------------
    const pop = document.createElement('div');
    pop.className = 'cs-pop';
    pop.setAttribute('role', 'listbox');
    pop.innerHTML =
      '<div class="cs-search">' + ICON_SEARCH +
      '<input type="text" spellcheck="false" autocomplete="off" />' +
      '<span class="cs-count"></span></div>' +
      '<div class="cs-list"></div>' +
      '<div class="cs-empty"></div>';
    document.body.appendChild(pop);
    const input = pop.querySelector('input');
    const list = pop.querySelector('.cs-list');
    const empty = pop.querySelector('.cs-empty');
    const countEl = pop.querySelector('.cs-count');

    let model = [];      // [{ label, options: [{ value, text, el }] }]
    let flat = [];       // opciones visibles, en orden
    let active = -1;

    function readModel() {
      model = [];
      let loose = null;
      Array.from(select.children).forEach((node) => {
        if (node.tagName === 'OPTGROUP') {
          model.push({ label: node.label, options: Array.from(node.children).map((o) => ({ value: o.value, text: o.textContent })) });
        } else if (node.tagName === 'OPTION') {
          if (!loose) { loose = { label: '', options: [] }; model.push(loose); }
          loose.options.push({ value: node.value, text: node.textContent });
        }
      });
    }

    function current() {
      const v = nativeValue.get.call(select);
      for (const g of model) for (const o of g.options) if (o.value === v) return { group: g, option: o };
      return null;
    }

    function paintTrigger() {
      const cur = current();
      catEl.textContent = cur && cur.group.label ? cur.group.label : '';
      catEl.style.display = catEl.textContent ? '' : 'none';
      valueEl.textContent = cur ? cur.option.text : (select.options[0] ? select.options[0].textContent : '');
      trigger.title = valueEl.textContent;
    }

    function render() {
      const q = fold(input.value.trim());
      const v = nativeValue.get.call(select);
      list.innerHTML = '';
      flat = [];
      let total = 0;
      model.forEach((g) => {
        const hits = g.options.filter((o) => !q || fold(o.text).includes(q) || fold(g.label).includes(q));
        total += g.options.length;
        if (!hits.length) return;
        const sec = document.createElement('div');
        sec.className = 'cs-group';
        if (g.label) {
          const h = document.createElement('div');
          h.className = 'cs-head';
          h.innerHTML = '<span></span><em></em>';
          h.firstChild.textContent = g.label;
          h.lastChild.textContent = hits.length;
          sec.appendChild(h);
        }
        hits.forEach((o) => {
          const b = document.createElement('div');
          b.className = 'cs-opt' + (o.value === v ? ' on' : '');
          b.setAttribute('role', 'option');
          b.dataset.value = o.value;
          b.innerHTML = '<span class="cs-name"></span><div class="cs-actions"><button type="button" class="cs-fav" tabindex="-1">' + ICON_STAR + '</button><span class="cs-tick">' + ICON_CHECK + '</span></div>';
          b.querySelector('.cs-name').textContent = o.text;
          const favBtn = b.querySelector('.cs-fav');
          const isF = opts.isFav && opts.isFav(o.value);
          favBtn.classList.toggle('on', !!isF);
          favBtn.title = isF ? t('tip.unfav') : t('tip.fav');
          favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (opts.onToggleFav) {
              opts.onToggleFav(o.value);
            }
          });
          b.addEventListener('mousemove', () => setActive(flat.indexOf(b), false));
          b.addEventListener('click', () => choose(o.value));
          sec.appendChild(b);
          flat.push(b);
        });
        list.appendChild(sec);
      });
      empty.textContent = flat.length ? '' : t('cs.empty');
      empty.style.display = flat.length ? 'none' : '';
      countEl.textContent = q ? flat.length + '/' + total : String(total);
      const sel = flat.findIndex((b) => b.dataset.value === v);
      setActive(sel >= 0 ? sel : (flat.length ? 0 : -1), true);
    }

    function setActive(i, scroll) {
      if (active >= 0 && flat[active]) flat[active].classList.remove('active');
      active = i;
      const el = flat[active];
      if (!el) return;
      el.classList.add('active');
      if (scroll) {
        const top = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
        list.scrollTop = Math.max(0, top);
      } else if (el.offsetTop < list.scrollTop + 32 || el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }

    function place() {
      const r = trigger.getBoundingClientRect();
      const width = Math.max(r.width, 330);
      const below = window.innerHeight - r.bottom - 14;
      const above = r.top - 14;
      const up = below < 260 && above > below;
      const room = Math.max(180, Math.min(440, up ? above : below));
      pop.style.width = width + 'px';
      pop.style.left = Math.min(window.innerWidth - width - 10, Math.max(10, r.left)) + 'px';
      pop.style.maxHeight = room + 'px';
      if (up) { pop.style.top = ''; pop.style.bottom = (window.innerHeight - r.top + 8) + 'px'; }
      else { pop.style.bottom = ''; pop.style.top = (r.bottom + 8) + 'px'; }
      pop.classList.toggle('up', up);
    }

    function open() {
      if (openOne && openOne !== api) openOne.close();
      openOne = api;
      readModel();
      input.value = '';
      input.placeholder = t('cs.search');
      render();
      place();
      pop.classList.add('open');
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => { input.focus(); setActive(active, true); });
    }

    function close() {
      if (!pop.classList.contains('open')) return;
      pop.classList.remove('open');
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (openOne === api) openOne = null;
      if (document.activeElement === input) input.blur();
    }

    function choose(value) {
      close();
      if (value === nativeValue.get.call(select)) return;
      nativeValue.set.call(select, value);
      paintTrigger();
      trigger.classList.remove('pulse');
      void trigger.offsetWidth;   // reinicia la animacion
      trigger.classList.add('pulse');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    trigger.addEventListener('click', () => (pop.classList.contains('open') ? close() : open()));
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(flat.length - 1, active + 1), false); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1), false); }
      else if (e.key === 'PageDown') { e.preventDefault(); setActive(Math.min(flat.length - 1, active + 8), false); }
      else if (e.key === 'PageUp') { e.preventDefault(); setActive(Math.max(0, active - 8), false); }
      else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) choose(flat[active].dataset.value); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); trigger.focus(); }
      else if (e.key === 'Tab') { close(); }
    });
    document.addEventListener('mousedown', (e) => {
      if (!pop.classList.contains('open')) return;
      if (pop.contains(e.target) || trigger.contains(e.target)) return;
      close();
    }, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);

    // El renderer reescribe las opciones al cambiar de idioma: el boton se repinta.
    new MutationObserver(() => { readModel(); paintTrigger(); if (pop.classList.contains('open')) render(); })
      .observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['label'] });
    // ...y si alguien pone el value por codigo, tambien.
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return nativeValue.get.call(select); },
      set(v) { nativeValue.set.call(select, v); paintTrigger(); }
    });

    const api = { open, close, refresh: () => { readModel(); paintTrigger(); }, trigger, pop };
    readModel();
    paintTrigger();
    return api;
  }

  window.TokkyoSelect = { enhance };
})();
