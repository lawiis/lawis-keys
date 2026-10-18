'use strict';
/*
 * Idiomas de la interfaz: espanol, ingles y frances.
 *
 * En el HTML, los textos se marcan con data-i18n="clave" (contenido) y
 * data-i18n-title="clave" (tooltip). Los textos que se generan desde JS piden
 * su traduccion con t('clave'). Si falta una clave se cae al espanol, y si
 * tampoco esta se muestra la propia clave, para que se note y no quede vacio.
 */
(function () {
  const STRINGS = {
    es: {
      'btn.ranking': 'Ranking',
      'tip.ranking': 'Ranking global',
      'tip.settings': 'Ajustes',
      'tip.logout': 'Cerrar sesión',
      'tip.minimize': 'Minimizar',
      'tip.tray': 'Ocultar en la bandeja',
      'tip.close': 'Cerrar',
      'tip.lang': 'Idioma',
      'tip.github': 'GitHub',
      'tip.discord': 'Discord',
      'tip.instagram': 'Instagram',
      'tip.web': 'Web de Lawis',
      'cs.search': 'Buscar sonido…',
      'cs.empty': 'Ningún sonido coincide',

      'toolbar.keys': 'Sonido de teclas',
      'toolbar.mouse': 'Sonido del ratón',
      'toolbar.count': 'Teclas',
      'loading': 'Cargando sonido',
      'packs.none': 'Sin packs',
      'mouse.synth': 'Clic sintético',

      'lb.title': 'Ranking global',
      'lb.sub': 'Quién ha pulsado más teclas. Solo cuentan teclas distintas.',
      'lb.loading': 'Cargando',
      'lb.empty': 'Aún no hay nadie. Sé el primero en teclear.',
      'lb.notset': 'El ranking global aún no está configurado.',
      'lb.error': 'No se pudo cargar el ranking.',

      'set.title': 'Ajustes',
      'set.sub': 'Se guardan solos en este equipo.',
      'tab.general': 'General',
      'tab.appearance': 'Temas y Efectos',
      'set.apptheme': 'Tema de la interfaz',
      'set.apptheme.d': 'Elige el estilo visual de la aplicación',
      'theme.dark': 'Dark Obsidian',
      'theme.glass': 'Liquid Glass',
      'theme.cyber': 'Cyber Glow',
      'set.snow': 'Efecto Copos de Nieve',
      'set.snow.d': 'Nieve suave que reacciona al teclear',
      'set.rpc': 'Rich Presence de Discord',
      'set.rpc.d': 'Muestra "Using Lawis Keys" en tu perfil',
      'set.tray': 'Cerrar en la bandeja',
      'set.tray.d': 'Mantiene la app en la bandeja del sistema al cerrar',
      'set.mouse': 'Sonido del ratón',
      'set.mouse.d': 'Suena al hacer clic, con su propio volumen',
      'set.release': 'Sonido al soltar la tecla',
      'set.release.d': 'Solo en los packs que lo traen',
      'set.sway': 'Movimiento del teclado',
      'set.sway.d': 'Balanceo lento cuando no lo tocas',
      'set.theme': 'Color del teclado',
      'set.theme.d': 'Todo en blanco y negro',
      'set.light': 'Retroiluminación',
      'set.light.d': 'Luz blanca bajo las teclas',

      'theme.Panda': 'Panda',
      'theme.Blanco': 'Blanco',
      'theme.Negro': 'Negro',
      'light.react': 'Reactiva',
      'light.solid': 'Fija',
      'light.breathe': 'Respira',
      'light.off': 'Apagada',

      'set.accent': 'Color de la interfaz',
      'set.accent.d': 'Tiñe toda la app y la luz del teclado',
      'set.accent.custom': 'Color personalizado',

      'tip.admin': 'Panel de administración',
      'adm.title': 'Panel de administración',
      'adm.search': 'Buscar por nombre o ID',
      'adm.refresh': 'Buscar',
      'adm.loading': 'Cargando',
      'adm.empty': 'Sin resultados.',
      'adm.error': 'No se pudo cargar la lista.',
      'adm.secure': 'Verificado por el servidor: nadie puede saltárselo.',
      'adm.weak': 'Sin servidor desplegado: los cambios se pueden falsear. Ver server/README.md.',
      'adm.set': 'Poner',
      'adm.add': 'Sumar',
      'adm.ban': 'Banear',
      'adm.unban': 'Quitar ban',
      'adm.banned': 'Baneado',
      'adm.done': 'Hecho.',
      'adm.forbidden': 'El servidor rechazó la acción: no eres administrador.',
      'adm.askScore': 'Teclas para {name}:',
      'adm.askDelta': 'Cuántas teclas sumar (o restar con -) a {name}:',
      'adm.confirmBan': '¿Banear a {name} del ranking?',

      'login.desc': 'Inicia sesión para empezar a teclear.',
      'login.btn': 'Iniciar sesión con Discord',
      'login.opening': 'Abriendo Discord…',
      'login.error': 'No se pudo iniciar sesión. Vuelve a intentarlo.',
      'user.guest': 'Invitado',

      'cat.favorites': 'Favoritos',
      'cat.recent': 'Usados recientemente',
      'tip.fav': 'Añadir a favoritos',
      'tip.unfav': 'Quitar de favoritos',
      'cat.memes': 'Memes y voces',
      'cat.games': 'Videojuegos y anime',
      'cat.typewriter': 'Máquinas de escribir',
      'cat.cherry': 'Cherry MX',
      'cat.creamy': 'Cremosos',
      'cat.tactile': 'Táctiles y Panda',
      'cat.clicky': 'Clicky',
      'cat.linear': 'Lineales',
      'cat.gaming': 'Teclados gaming',
      'cat.other': 'Otros'
    },

    en: {
      'btn.ranking': 'Ranking',
      'tip.ranking': 'Global ranking',
      'tip.settings': 'Settings',
      'tip.logout': 'Log out',
      'tip.minimize': 'Minimize',
      'tip.tray': 'Hide to tray',
      'tip.close': 'Close',
      'tip.lang': 'Language',
      'tip.github': 'GitHub',
      'tip.discord': 'Discord',
      'tip.instagram': 'Instagram',
      'tip.web': 'Lawis website',
      'cs.search': 'Search sounds…',
      'cs.empty': 'No sound matches',

      'toolbar.keys': 'Key sound',
      'toolbar.mouse': 'Mouse sound',
      'toolbar.count': 'Keys',
      'loading': 'Loading sound',
      'packs.none': 'No packs',
      'mouse.synth': 'Synthetic click',

      'lb.title': 'Global ranking',
      'lb.sub': 'Who has pressed the most keys. Only different keys count.',
      'lb.loading': 'Loading',
      'lb.empty': 'Nobody yet. Be the first to type.',
      'lb.notset': 'The global ranking is not set up yet.',
      'lb.error': "Couldn't load the ranking.",

      'set.title': 'Settings',
      'set.sub': 'Saved automatically on this computer.',
      'tab.general': 'General',
      'tab.appearance': 'Themes & FX',
      'set.apptheme': 'UI Theme',
      'set.apptheme.d': 'Choose interface styling and glassmorphism',
      'theme.dark': 'Dark Obsidian',
      'theme.glass': 'Liquid Glass',
      'theme.cyber': 'Cyber Glow',
      'set.snow': 'Snowflakes Effect',
      'set.snow.d': 'Gentle falling snow drifting with keypresses',
      'set.rpc': 'Discord Rich Presence',
      'set.rpc.d': 'Shows "Using Lawis Keys" on your profile',
      'set.tray': 'Close to tray',
      'set.tray.d': 'Keep app running in system tray when closing',
      'set.mouse': 'Mouse sound',
      'set.mouse.d': 'Plays on click, with its own volume',
      'set.release': 'Key release sound',
      'set.release.d': 'Only on packs that include it',
      'set.sway': 'Keyboard motion',
      'set.sway.d': 'Slow sway when you are not typing',
      'set.theme': 'Keyboard colour',
      'set.theme.d': 'All in black and white',
      'set.light': 'Backlight',
      'set.light.d': 'White light under the keys',

      'theme.Panda': 'Panda',
      'theme.Blanco': 'White',
      'theme.Negro': 'Black',
      'light.react': 'Reactive',
      'light.solid': 'Solid',
      'light.breathe': 'Breathe',
      'light.off': 'Off',

      'set.accent': 'Interface colour',
      'set.accent.d': 'Tints the whole app and the keyboard light',
      'set.accent.custom': 'Custom colour',

      'tip.admin': 'Admin panel',
      'adm.title': 'Admin panel',
      'adm.search': 'Search by name or ID',
      'adm.refresh': 'Search',
      'adm.loading': 'Loading',
      'adm.empty': 'No results.',
      'adm.error': "Couldn't load the list.",
      'adm.secure': 'Verified by the server: nobody can bypass it.',
      'adm.weak': 'No server deployed: changes can be faked. See server/README.md.',
      'adm.set': 'Set',
      'adm.add': 'Add',
      'adm.ban': 'Ban',
      'adm.unban': 'Unban',
      'adm.banned': 'Banned',
      'adm.done': 'Done.',
      'adm.forbidden': 'The server refused: you are not an administrator.',
      'adm.askScore': 'Keys for {name}:',
      'adm.askDelta': 'How many keys to add (or remove with -) to {name}:',
      'adm.confirmBan': 'Ban {name} from the ranking?',

      'login.desc': 'Sign in to start typing.',
      'login.btn': 'Sign in with Discord',
      'login.opening': 'Opening Discord…',
      'login.error': "Couldn't sign in. Please try again.",
      'user.guest': 'Guest',

      'cat.favorites': 'Favorites',
      'cat.recent': 'Recently used',
      'tip.fav': 'Add to favorites',
      'tip.unfav': 'Remove from favorites',
      'cat.memes': 'Memes and voices',
      'cat.games': 'Games and anime',
      'cat.typewriter': 'Typewriters',
      'cat.cherry': 'Cherry MX',
      'cat.creamy': 'Creamy',
      'cat.tactile': 'Tactile and Panda',
      'cat.clicky': 'Clicky',
      'cat.linear': 'Linear',
      'cat.gaming': 'Gaming keyboards',
      'cat.other': 'Others'
    },

    fr: {
      'btn.ranking': 'Classement',
      'tip.ranking': 'Classement mondial',
      'tip.settings': 'Paramètres',
      'tip.logout': 'Se déconnecter',
      'tip.minimize': 'Réduire',
      'tip.tray': 'Réduire dans la zone de notification',
      'tip.close': 'Fermer',
      'tip.lang': 'Langue',
      'tip.github': 'GitHub',
      'tip.discord': 'Discord',
      'tip.instagram': 'Instagram',
      'tip.web': 'Site de Lawis',
      'cs.search': 'Rechercher un son…',
      'cs.empty': 'Aucun son ne correspond',

      'toolbar.keys': 'Son des touches',
      'toolbar.mouse': 'Son de la souris',
      'toolbar.count': 'Touches',
      'loading': 'Chargement du son',
      'packs.none': 'Aucun pack',
      'mouse.synth': 'Clic synthétique',

      'lb.title': 'Classement mondial',
      'lb.sub': 'Qui a appuyé sur le plus de touches. Seules les touches différentes comptent.',
      'lb.loading': 'Chargement',
      'lb.empty': "Personne pour l'instant. Sois le premier à taper.",
      'lb.notset': "Le classement mondial n'est pas encore configuré.",
      'lb.error': 'Impossible de charger le classement.',

      'set.title': 'Paramètres',
      'set.sub': 'Enregistrés automatiquement sur cet ordinateur.',
      'tab.general': 'Général',
      'tab.appearance': 'Thèmes & Effets',
      'set.apptheme': 'Thème de l\'interface',
      'set.apptheme.d': 'Choisissez le style visuel et l\'effet verre',
      'theme.dark': 'Dark Obsidian',
      'theme.glass': 'Liquid Glass',
      'theme.cyber': 'Cyber Glow',
      'set.snow': 'Effet Flocons de Neige',
      'set.snow.d': 'Flocons de neige réactifs à la frappe',
      'set.rpc': 'Rich Presence Discord',
      'set.rpc.d': 'Affiche « Using Lawis Keys » sur ton profil',
      'set.tray': 'Fermer dans la zone de notification',
      'set.tray.d': 'Garde l\'application dans la zone de notification à la fermeture',
      'set.mouse': 'Son de la souris',
      'set.mouse.d': 'Se déclenche au clic, avec son propre volume',
      'set.release': 'Son au relâchement',
      'set.release.d': "Uniquement sur les packs qui l'incluent",
      'set.sway': 'Mouvement du clavier',
      'set.sway.d': 'Balancement lent quand tu ne tapes pas',
      'set.theme': 'Couleur du clavier',
      'set.theme.d': 'Tout en noir et blanc',
      'set.light': 'Rétroéclairage',
      'set.light.d': 'Lumière blanche sous les touches',

      'theme.Panda': 'Panda',
      'theme.Blanco': 'Blanc',
      'theme.Negro': 'Noir',
      'light.react': 'Réactif',
      'light.solid': 'Fixe',
      'light.breathe': 'Respiration',
      'light.off': 'Éteint',

      'set.accent': "Couleur de l'interface",
      'set.accent.d': "Teinte toute l'app et la lumière du clavier",
      'set.accent.custom': 'Couleur personnalisée',

      'tip.admin': 'Panneau d’administration',
      'adm.title': 'Panneau d’administration',
      'adm.search': 'Chercher par nom ou ID',
      'adm.refresh': 'Chercher',
      'adm.loading': 'Chargement',
      'adm.empty': 'Aucun résultat.',
      'adm.error': 'Impossible de charger la liste.',
      'adm.secure': 'Vérifié par le serveur : personne ne peut le contourner.',
      'adm.weak': 'Serveur non déployé : les changements sont falsifiables. Voir server/README.md.',
      'adm.set': 'Définir',
      'adm.add': 'Ajouter',
      'adm.ban': 'Bannir',
      'adm.unban': 'Débannir',
      'adm.banned': 'Banni',
      'adm.done': 'Fait.',
      'adm.forbidden': "Le serveur a refusé : tu n'es pas administrateur.",
      'adm.askScore': 'Touches pour {name} :',
      'adm.askDelta': 'Combien de touches ajouter (ou retirer avec -) à {name} :',
      'adm.confirmBan': 'Bannir {name} du classement ?',

      'login.desc': 'Connecte-toi pour commencer à taper.',
      'login.btn': 'Se connecter avec Discord',
      'login.opening': 'Ouverture de Discord…',
      'login.error': 'La connexion a échoué. Réessaie.',
      'user.guest': 'Invité',

      'cat.favorites': 'Favoris',
      'cat.recent': 'Récemment utilisés',
      'tip.fav': 'Ajouter aux favoris',
      'tip.unfav': 'Retirer des favoris',
      'cat.memes': 'Mèmes et voix',
      'cat.games': 'Jeux vidéo et anime',
      'cat.typewriter': 'Machines à écrire',
      'cat.cherry': 'Cherry MX',
      'cat.creamy': 'Crémeux',
      'cat.tactile': 'Tactiles et Panda',
      'cat.clicky': 'Clicky',
      'cat.linear': 'Linéaires',
      'cat.gaming': 'Claviers gaming',
      'cat.other': 'Autres'
    }
  };

  const LANGS = [
    { code: 'es', label: 'Español', short: 'ES' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' }
  ];

  let current = 'en';

  // t('clave') o t('clave', {name: 'Leo'}) para rellenar los {huecos}
  function t(key, vars) {
    const table = STRINGS[current] || STRINGS.en;
    let s = table[key] !== undefined ? table[key]
      : STRINGS.en[key] !== undefined ? STRINGS.en[key]
      : STRINGS.es[key] !== undefined ? STRINGS.es[key]
      : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }

  // Recorre el DOM y pone cada texto, tooltip y placeholder en el idioma elegido
  function apply(lang) {
    if (STRINGS[lang]) current = lang;
    document.documentElement.lang = current;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
  }

  function detect() {
    const saved = localStorage.getItem('tk_lang');
    if (saved && STRINGS[saved]) return saved;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return STRINGS[nav] ? nav : 'en';
  }

  window.TOKKYO_I18N = { t, apply, detect, LANGS, get lang() { return current; } };
})();
