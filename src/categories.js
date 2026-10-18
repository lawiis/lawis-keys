'use strict';
/*
 * Agrupa los packs de sonido en categorias a partir de su nombre.
 * El orden importa: gana la primera regla que casa, asi que las categorias
 * mas especificas (memes, juegos) van antes que las genericas por tipo de switch,
 * si no "Sans Undertale" acabaria en Lineales por contener "sans"... y cosas asi.
 */
(function () {
  const CATEGORIES = [
    {
      id: 'memes',
      name: 'Memes y voces',
      test: /amogus|bruh|vine boom|moan|ahegao|\bvoice\b|dallas|spongebob|never gonna|rick astley|owa|gunshot|the hit|\bchile\b|hitmarker|goose|roblox|oof|scream|laugh/i
    },
    {
      id: 'games',
      name: 'Videojuegos y anime',
      test: /\bosu\b|osu-|osu!|nagatoro|animal crossing|animalese|isabelle|zelda|to the past|paper mario|\bpmd\b|chrono trigger|bug fables|sans|papyrus|mettaton|undertale|omori|ace attorney|phoenix wright|trails in the sky|fallout|cry of fear|penumbra|8 bit|regina|blip|hlkeys/i
    },
    {
      id: 'typewriter',
      name: 'Maquinas de escribir',
      test: /typewriter|teleprinter|lincoln|model.?f|unicomp/i
    },
    {
      id: 'cherry',
      name: 'Cherry MX',
      test: /cherry\s*mx|cherrymx|^mx\s|speed silver/i
    },
    {
      id: 'creamy',
      name: 'Cremosos',
      test: /cream|oreo|tealios|banana split|koala|crystal purple/i
    },
    {
      id: 'tactile',
      name: 'Tactiles y Panda',
      test: /panda|topre|brown|aqua|tactil|tactile/i
    },
    {
      id: 'clicky',
      name: 'Clicky',
      test: /jade|box white|kalih|kailh|green|navy|buckling|turquoise|blue|click/i
    },
    {
      id: 'linear',
      name: 'Lineales',
      test: /gateron|silver|\bred\b|black|sine|minimal tick|linear|lineal/i
    },
    {
      id: 'gaming',
      name: 'Teclados gaming',
      test: /razer|razor|steelseries|apex|huntman|huntsman|trust|opera|gxt|syndicate|hyperx|revolt/i
    }
  ];

  const OTHER = { id: 'other', name: 'Otros' };

  function categoryOf(name) {
    const n = String(name || '');
    for (const c of CATEGORIES) if (c.test.test(n)) return c;
    return OTHER;
  }

  // Devuelve [{id, name, packs:[...]}, ...] sin categorias vacias, en el orden de arriba
  function group(packs) {
    const buckets = new Map();
    packs.forEach((p) => {
      const c = categoryOf((p.config && p.config.name) || p.folder);
      if (!buckets.has(c.id)) buckets.set(c.id, { id: c.id, name: c.name, packs: [] });
      buckets.get(c.id).packs.push(p);
    });
    const order = CATEGORIES.concat([OTHER]);
    const out = [];
    order.forEach((c) => {
      const b = buckets.get(c.id);
      if (!b) return;
      b.packs.sort((a, z) => (a.config.name || a.folder).localeCompare(z.config.name || z.folder, 'es'));
      out.push(b);
    });
    return out;
  }

  window.TOKKYO_CATEGORIES = { group, categoryOf };
})();
